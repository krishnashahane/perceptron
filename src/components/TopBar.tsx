"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

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
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19) + "Z");
    }, 1000);
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
          <span data-text="PERCEPTRON" className="glitch font-semibold tracking-[0.25em] text-[13px] text-glow">PERCEPTRON</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.filter((n) => !n.admin || role === "admin").map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-md text-[11px] tracking-[0.15em] transition ${
                  active ? "text-black bg-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--panel)]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-[11px]">
          <span className="hidden sm:flex items-center gap-1.5 text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" /> LIVE
          </span>
          <span className="mono text-[var(--accent)] tabular-nums hidden md:inline">{clock}</span>
          <span className="text-[var(--muted)] hidden lg:inline">
            {user} · <span className="text-[var(--fg)] uppercase">{role}</span>
          </span>
          <button onClick={logout} className="text-[var(--muted)] hover:text-[var(--crit)] transition border border-[var(--border)] rounded px-2 py-1">
            EXIT
          </button>
        </div>
      </div>
    </header>
  );
}
