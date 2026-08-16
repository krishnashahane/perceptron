import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getResult } from "@/lib/store";
import TopBar from "@/components/TopBar";
import StatusStrip from "@/components/StatusStrip";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/");
  const r = getResult();
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar user={session.user} role={session.role} />
      <StatusStrip sectors={8} nodes={r.kpis.beneficiaries} />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 flex-1">{children}</div>
      <footer className="border-t border-[var(--border)] py-3">
        <div className="mx-auto max-w-[1400px] px-4 flex items-center justify-between text-[10px] text-[var(--faint)]">
          <span>PERCEPTRON · integrity intelligence · human-in-the-loop</span>
          <span>detect → correlate → explain → decide → audit</span>
        </div>
      </footer>
    </div>
  );
}
