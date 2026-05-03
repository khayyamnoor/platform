import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@platform/ui";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--color-ink)]">
          Apps
        </h1>
        <p className="mt-1 text-sm text-[var(--color-body)]">
          Pick an app to get started. New apps are added every slice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No apps yet</CardTitle>
          <CardDescription>
            Slice 1 will land cinematic-ai-video-director here. Until then, this page is the
            traceable bullet for auth → db → ui — your wallet has been provisioned and your plan +
            credit pill render in the header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
            Issue 0017 mounts the cinematic director route into this grid.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
