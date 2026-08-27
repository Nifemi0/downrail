"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WalletSessionValue = {
  account: string | null;
  chainId: string | null;
  provider: Eip1193Provider | null;
  setAccount: (account: string | null) => void;
  setChainId: (chainId: string | null) => void;
  setProvider: (provider: Eip1193Provider | null) => void;
};

export type ProviderRequest = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

export type Eip1193Provider = {
  request: (request: ProviderRequest) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

const WalletSessionContext = createContext<WalletSessionValue | null>(null);

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const value = useMemo(
    () => ({ account, chainId, provider, setAccount, setChainId, setProvider }),
    [account, chainId, provider],
  );

  return (
    <WalletSessionContext.Provider value={value}>
      {children}
    </WalletSessionContext.Provider>
  );
}

export function useWalletSession() {
  const value = useContext(WalletSessionContext);
  if (!value) {
    throw new Error("useWalletSession must be used inside WalletSessionProvider");
  }
  return value;
}
