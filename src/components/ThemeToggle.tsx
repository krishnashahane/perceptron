"use client";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

// Persisted light/dark switch. The no-flash script in the root layout sets the
// initial data-theme before paint; this only reflects + mutates it.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const t = (document.documentElement.dataset.theme as Theme) || "dark";
    setTheme(t);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("perceptron-theme", next); } catch {}
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "daylight" : "night"} mode`}
      aria-label="Toggle color theme"
      className="shrink-0 grid place-items-center w-7 h-7 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--border-bright)] transition text-[13px] mono"
    >
      {theme === "dark" ? "◐" : "◑"}
    </button>
  );
}
