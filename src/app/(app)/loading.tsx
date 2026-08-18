// Shared loading state for the authed console — thin pulsing cyan skeletons
// that match the command-center aesthetic (prevents blank flashes during RSC).
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-6 w-72 rounded skel" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="panel p-4 h-20">
            <div className="h-2 w-16 rounded skel" />
            <div className="h-6 w-20 rounded skel mt-3" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 panel h-80" />
        <div className="panel h-80" />
      </div>
    </div>
  );
}
