import { auth } from "@clerk/nextjs/server";

/**
 * Placeholder protected route. Real shell + content lands in issue 0008.
 * If middleware hasn't already redirected unauthenticated requests, calling
 * `auth()` here returns a userId of `null` and we early-redirect.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  return (
    <main className="px-8 py-12">
      <h1 className="text-2xl font-medium tracking-tight text-[#0a0b0d]">Dashboard</h1>
      <p className="mt-4 text-sm text-[#5b616e]">
        Signed in as <span className="font-mono text-[#0a0b0d]">{userId}</span>.
      </p>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#7c828a]">
        Skeleton — real content lands in issue 0008.
      </p>
    </main>
  );
}
