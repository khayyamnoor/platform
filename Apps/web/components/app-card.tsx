import type { AppManifest } from "@platform/app-registry";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@platform/ui";
import Link from "next/link";

export function AppCard({ app }: { app: AppManifest }) {
  return (
    <Link
      href={app.route as `/apps/${string}`}
      className="block transition-opacity hover:opacity-90"
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{app.name}</CardTitle>
            {app.status === "BETA" && (
              <Badge variant="warning" aria-label={`Status: ${app.status}`}>
                Beta
              </Badge>
            )}
          </div>
          <CardDescription>{app.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[var(--color-muted)]">
            About {app.estimatedCreditsPerRun} credits per run · about{" "}
            {app.actionsPerPlanApprox.STARTER_30} runs on Starter
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
