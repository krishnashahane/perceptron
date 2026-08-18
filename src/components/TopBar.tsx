"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/command", label: "COMMAND" },
  { href: "/graph", label: "NETWORK" },
  { href: "/simulate", label: "SIMULATE" },
  { href: "/ingest", label: "INGEST", admin: true },
  { href: "/audit", label: "AUDIT", admin: true },
];

export default function TopBar({ user, role }: { user: string; role: Role }) {
  const path = usePathname();
  const router = useRouter();
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19) + "Z");
    tick(); // set immediately on mount — never show a placeholder
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 h-14 flex items-center gap-5">
        <Link href="/command" className="flex items-center gap-2.5 shrink-0">
          <span className="relative grid place-items-center w-7 h-7 rounded-md border border-[var(--border-bright)]"
            style={{ background: "conic-gradient(from 210deg, #0a1420, #0f2233, #0a1420)" }}>
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] dot-live" />
          </span>
          <span className="flex flex-col leading-none">
            <span data-text="PERCEPTRON" className="glitch font-semibold tracking-[0.25em] text-[13px] text-glow">PERCEPTRON</span>
            <span className="text-[8px] tracking-[0.2em] text-[var(--faint)] mono mt-0.5 hidden sm:block">NODE ALPHA-7 · GOVT INTEGRITY GRID</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar">
          {NAV.filter((n) => !n.admin || role === "admin").map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch={false}
                className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] tracking-[0.12em] transition ${
                  active ? "bg-[var(--accent)] text-[color:var(--on-accent)]" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--panel)]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto shrink-0 flex items-center gap-3 sm:gap-4 text-[11px]">
          <span className="hidden sm:flex items-center gap-1.5 text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" /> LIVE
          </span>
          {clock ? (
            <span className="mono text-[var(--accent)] tabular-nums hidden md:inline">{clock}</span>
          ) : (
            <span className="hidden md:inline w-[68px] h-3 rounded bg-[var(--panel)] skel" aria-hidden />
          )}
          <span className="text-[var(--muted)] hidden lg:inline">
            {user} · <span className="text-[var(--fg)] uppercase">{role}</span>
          </span>
          <ThemeToggle />
          <button
            onClick={logout}
            title="Sign out — clears your session cookie and returns to the lock screen"
            className="shrink-0 text-[var(--muted)] hover:text-[var(--crit)] hover:border-[var(--crit)] transition border border-[var(--border)] rounded px-2 py-1"
          >
            EXIT
          </button>
        </div>
      </div>
    </header>
  );
}
