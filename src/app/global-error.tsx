"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en"><body><main className="recovery-page">
      <h1>Downrail could not load.</h1>
      <p>No transaction is sent automatically. Retry when you are ready.</p>
      <button onClick={reset} type="button">Reload application</button>
    </main></body></html>
  );
}
