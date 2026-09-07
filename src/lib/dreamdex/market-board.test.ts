import { afterEach, expect, it, vi } from "vitest";
const exchange = vi.hoisted(() => ({ client: { listBinaryVenueIds: vi.fn(), listBinaryAssets: vi.fn(), listLiveBinaryMarkets: vi.fn(), getBookTops: vi.fn() }, close: vi.fn() }));
vi.mock("./exchange", () => ({ createReadOnlyExchange: () => exchange }));
import { getMarketBoardSnapshot } from "./market-board";
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

it("bounds an unresponsive feed and returns a safe retryable error", async () => {
  vi.useFakeTimers();
  exchange.client.listBinaryVenueIds.mockReturnValue(new Promise(() => {}));
  exchange.client.listBinaryAssets.mockResolvedValue([]);
  exchange.client.listLiveBinaryMarkets.mockResolvedValue([]);
  exchange.close.mockResolvedValue(undefined);
  const pending = getMarketBoardSnapshot();
  await vi.advanceTimersByTimeAsync(8_001);
  expect(await pending).toMatchObject({ ok: false, markets: [], error: "DreamDEX inventory is temporarily unavailable. Please retry." });
  expect(exchange.close).toHaveBeenCalledOnce();
});

it("can recover on the next request without using fabricated markets", async () => {
  exchange.client.listBinaryVenueIds.mockResolvedValue([]);
  exchange.client.listBinaryAssets.mockResolvedValue(["ETH"]);
  exchange.client.listLiveBinaryMarkets.mockRejectedValueOnce(new Error("internal detail")).mockResolvedValueOnce([]);
  exchange.close.mockResolvedValue(undefined);
  expect((await getMarketBoardSnapshot()).error).not.toContain("internal detail");
  expect(await getMarketBoardSnapshot()).toMatchObject({ ok: true, markets: [], error: null });
});
