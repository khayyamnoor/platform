import { listApps } from "@platform/app-registry";
import { AppCard } from "../../../components/app-card";

export default function DashboardPage() {
  const apps = listApps();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--color-ink)]">
          Apps
        </h1>
        <p className="mt-1 text-sm text-[var(--color-body)]">
          Pick an app to get started. New apps land every slice.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
