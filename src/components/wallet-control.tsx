"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  useWalletSession,
  type Eip1193Provider,
} from "@/components/wallet-session";

const SHANNON_CHAIN_ID_HEX = "0xc488";
const SHANNON_EXPLORER_URL = "https://shannon-explorer.somnia.network";

type ProviderDetail = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Provider;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return Number((error as { code: unknown }).code);
  }
  return null;
}

export function WalletControl() {
  const { account, chainId, setAccount, setChainId, setProvider } = useWalletSession();
  const [providers, setProviders] = useState<ProviderDetail[]>([]);
  const [selected, setSelected] = useState<ProviderDetail | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    firstMenuItemRef.current?.focus();
    const closeMenu = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && controlRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    window.addEventListener("keydown", closeMenu);
    window.addEventListener("pointerdown", closeMenu);
    return () => {
      window.removeEventListener("keydown", closeMenu);
      window.removeEventListener("pointerdown", closeMenu);
    };
  }, [menuOpen]);

  useEffect(() => {
    const announced = new Set<string>();
    const onAnnouncement = (event: Event) => {
      const detail = (event as CustomEvent<ProviderDetail>).detail;
      if (!detail?.info?.uuid || announced.has(detail.info.uuid)) return;
      announced.add(detail.info.uuid);
      setProviders((current) => [...current, detail]);
      if (announced.size === 1) setProvider(detail.provider);
      setSelected((current) => current ?? detail);
    };

    window.addEventListener("eip6963:announceProvider", onAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const legacyTimer = window.setTimeout(() => {
      if (!window.ethereum || announced.size > 0) return;
      const legacy: ProviderDetail = {
        info: { uuid: "legacy-injected-wallet", name: "Browser wallet" },
        provider: window.ethereum,
      };
      setProviders([legacy]);
      setSelected(legacy);
      setProvider(legacy.provider);
    }, 250);

    return () => {
      window.clearTimeout(legacyTimer);
      window.removeEventListener("eip6963:announceProvider", onAnnouncement);
    };
  }, [setProvider]);

  useEffect(() => {
    const provider = selected?.provider;
    if (!provider) return;

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? args[0] : [];
      setAccount(typeof accounts[0] === "string" ? accounts[0] : null);
    };
    const onChainChanged = (...args: unknown[]) => {
      setChainId(typeof args[0] === "string" ? args[0].toLowerCase() : null);
    };

    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);
    void Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" }),
    ]).then(([accountsResult, chainResult]) => {
      const accounts = Array.isArray(accountsResult) ? accountsResult : [];
      setAccount(typeof accounts[0] === "string" ? accounts[0] : null);
      setChainId(typeof chainResult === "string" ? chainResult.toLowerCase() : null);
    }).catch(() => undefined);

    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [selected, setAccount, setChainId]);

  async function connect(detail: ProviderDetail) {
    setPending(true);
    setMessage(null);
    setSelected(detail);
    setProvider(detail.provider);
    setMenuOpen(false);
    try {
      const result = await detail.provider.request({ method: "eth_requestAccounts" });
      const accounts = Array.isArray(result) ? result : [];
      setAccount(typeof accounts[0] === "string" ? accounts[0] : null);
      const currentChain = await detail.provider.request({ method: "eth_chainId" });
      setChainId(typeof currentChain === "string" ? currentChain.toLowerCase() : null);
    } catch (error) {
      setMessage(getErrorCode(error) === 4001 ? "Connection cancelled." : "Wallet connection failed.");
    } finally {
      setPending(false);
    }
  }

  async function switchToShannon() {
    if (!selected) return;
    setPending(true);
    setMessage(null);
    try {
      await selected.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SHANNON_CHAIN_ID_HEX }],
      });
      const currentChain = await selected.provider.request({ method: "eth_chainId" });
      setChainId(typeof currentChain === "string" ? currentChain.toLowerCase() : null);
    } catch (error) {
      if (getErrorCode(error) !== 4902) {
        setMessage(getErrorCode(error) === 4001 ? "Network switch cancelled." : "Could not switch networks.");
        setPending(false);
        return;
      }
      try {
        await selected.provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SHANNON_CHAIN_ID_HEX,
            chainName: "Somnia Testnet (Shannon)",
            nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
            rpcUrls: ["https://dream-rpc.somnia.network"],
            blockExplorerUrls: [SHANNON_EXPLORER_URL],
          }],
        });
      } catch (addError) {
        setMessage(getErrorCode(addError) === 4001 ? "Network addition cancelled." : "Could not add Shannon testnet.");
      }
    } finally {
      setPending(false);
    }
  }

  if (account) {
    const onShannon = chainId === SHANNON_CHAIN_ID_HEX;
    return (
      <div className="wallet-control">
        {onShannon ? (
          <a className="wallet-account" href={`${SHANNON_EXPLORER_URL}/address/${account}`} target="_blank" rel="noreferrer" title="View address on Shannon explorer">
            <i /> {shortAddress(account)}
          </a>
        ) : (
          <button className="wallet-switch" disabled={pending} onClick={switchToShannon} type="button">{pending ? "Switching…" : "Switch to Shannon"}</button>
        )}
        <button
          className="wallet-reset"
          onClick={() => {
            setAccount(null);
            setChainId(null);
            setProvider(null);
            setSelected(null);
            setMessage("Local wallet session reset.");
          }}
          type="button"
        >Reset</button>
        {message && <span className="wallet-message" role="status">{message}</span>}
      </div>
    );
  }

  return (
    <div className="wallet-control" ref={controlRef}>
      <button
        aria-controls={providers.length > 1 ? menuId : undefined}
        aria-expanded={menuOpen}
        aria-haspopup={providers.length > 1 ? "menu" : undefined}
        className="wallet-connect"
        disabled={pending}
        onClick={() => {
          if (providers.length === 0) setMessage("Install an EIP-6963 compatible wallet, then reload Downrail.");
          else if (providers.length === 1) void connect(providers[0]);
          else setMenuOpen((open) => !open);
        }}
        type="button"
      >
        {pending ? "Connecting…" : providers.length === 0 ? "Wallet help" : "Connect wallet"}
      </button>
      {menuOpen && providers.length > 1 && (
        <div className="wallet-menu" id={menuId} role="menu">
          <span>Choose wallet</span>
          {providers.map((detail) => (
            <button ref={detail === providers[0] ? firstMenuItemRef : undefined} key={detail.info.uuid} onClick={() => void connect(detail)} role="menuitem" type="button">{detail.info.name}</button>
          ))}
        </div>
      )}
      {message && <span className="wallet-message" role="status">{message}</span>}
    </div>
  );
}
