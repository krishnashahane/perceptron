import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Ingest from "@/components/Ingest";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Ledger Ingestion",
  description: "Upload a real scheme dataset (CSV) and run the full rule + graph + anomaly engine on your records.",
};
export const dynamic = "force-dynamic";

export default async function IngestPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/command");
  return (
    <div className="space-y-5">
      <div>
        <div className="kicker">real data ingestion</div>
        <h1 className="text-lg font-semibold tracking-wide mt-1">Ledger Ingestion</h1>
        <p className="text-[12px] text-[var(--muted)] mt-1 max-w-2xl">
          Upload a real scheme dataset (CSV). PERCEPTRON runs the same rule + graph + anomaly engine on your
          records and returns detected cases, exposure and multi-hop rings — in-memory, never persisted.
        </p>
      </div>
      <Ingest />
    </div>
  );
}
