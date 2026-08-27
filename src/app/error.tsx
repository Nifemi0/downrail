"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Downrail route error", { digest: error.digest });
  }, [error]);

  return (
    <main className="recovery-page">
      <p className="eyebrow">Recoverable interruption</p>
      <h1>Downrail hit a broken rail.</h1>
      <p>Your wallet remains in control. Reopen any submitted transaction from the recovered activity panel after retrying.</p>
      <button onClick={reset} type="button">Try again</button>
    </main>
  );
}
