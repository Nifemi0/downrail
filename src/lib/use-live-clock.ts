"use client";

import { useSyncExternalStore } from "react";

export function subscribeToClock(notify: () => void) {
  const timer = window.setInterval(notify, 1_000);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", notify);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", notify);
  };
}

export function currentUnixSeconds() { return Math.floor(Date.now() / 1_000); }
const serverClock = () => 0;
export function useLiveClock() {
  return useSyncExternalStore(subscribeToClock, currentUnixSeconds, serverClock);
}
