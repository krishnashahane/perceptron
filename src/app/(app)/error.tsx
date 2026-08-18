"use client";
// Graceful degradation for any transient RSC/render failure — never a raw 503.
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-only, minimal — no internal state leaked to production console.
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] grid place-items-center">
      <div className="panel hud-frame p-8 max-w-md text-center">
        <div className="kicker text-[var(--crit)]">signal interrupted</div>
        <h2 className="text-lg font-semibold mt-2">Console link dropped</h2>
        <p className="text-[12px] text-[var(--muted)] mt-2">
          A transient error interrupted this view. The detection grid is unaffected — re-establish the link.
        </p>
        <button
          onClick={reset}
          className="mt-5 bg-[var(--accent)] text-black font-semibold rounded-md px-4 py-2 text-[12px] hover:brightness-110"
        >
          RECONNECT ▸
        </button>
      </div>
    </div>
  );
}
