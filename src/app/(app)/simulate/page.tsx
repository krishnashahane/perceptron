import { getSimulation } from "@/lib/store";
import Simulator from "@/components/Simulator";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "What-If Simulator",
  description: "Model an intervention before it happens — disrupt a hub and quantify the public money it would protect.",
};
export const dynamic = "force-dynamic";

export default function SimulatePage() {
  const sim = getSimulation();
  return (
    <div className="space-y-5">
      <div>
        <div className="kicker">preventive governance</div>
        <h1 className="text-lg font-semibold tracking-wide mt-1">What-If Disruption Simulator</h1>
        <p className="text-[12px] text-[var(--muted)] mt-1 max-w-2xl">
          Model an intervention before it happens. Disrupt a shared bank account or contractor and watch the
          linked ring collapse — quantifying exactly how much public money the action would protect.
        </p>
      </div>
      <Simulator hubs={sim.hubs} cases={sim.cases} totalExposure={sim.totalExposure} />
    </div>
  );
}
