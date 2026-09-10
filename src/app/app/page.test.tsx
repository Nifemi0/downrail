import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import AppPage from "./page";
import { WalletSessionProvider } from "@/components/wallet-session";

it("renders planner and portfolio without awaiting the market feed", () => {
  const page = AppPage();
  expect(page).not.toBeInstanceOf(Promise);
  const html = renderToStaticMarkup(<WalletSessionProvider>{page}</WalletSessionProvider>);
  expect(html).toContain("Tell us what you hold.");
  expect(html).toContain("Connect a wallet to scan positions.");
  expect(html).toContain("Loading protection windows");
});
