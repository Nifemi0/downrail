import { afterEach, expect, it, vi } from "vitest";
import { currentUnixSeconds, subscribeToClock } from "./use-live-clock";
import { buildManualRolloverRecommendation } from "@/features/rollover/build-recommendation";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("ticks into near expiry without needing a new market snapshot and cleans up", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000_000);
  const events = new EventTarget();
  const documentEvents = new EventTarget();
  vi.stubGlobal("window", { setInterval, clearInterval, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  vi.stubGlobal("document", documentEvents);
  const input = { marketId: "test", status: "FILLED" as const, marketExpiryUnixSeconds: 1_001_000, requestedHorizonEndsAt: 1_010_000, futureBudgetReserveRaw: "1000000" };
  const read = () => buildManualRolloverRecommendation({ ...input, nowUnixSeconds: currentUnixSeconds() });
  expect(read()).toBeNull();
  const notify = vi.fn(read);
  const unsubscribe = subscribeToClock(notify);
  vi.advanceTimersByTime(701_000);
  expect(notify.mock.results.at(-1)?.value?.trigger).toBe("NEAR_EXPIRY");
  events.dispatchEvent(new Event("focus"));
  const count = notify.mock.calls.length;
  unsubscribe();
  vi.advanceTimersByTime(2_000);
  events.dispatchEvent(new Event("focus"));
  expect(notify).toHaveBeenCalledTimes(count);
});
