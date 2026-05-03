import { auth, currentUser } from "@clerk/nextjs/server";
import type { ReactNode } from "react";
import { Header } from "../../components/header";
import { ensureWallet } from "../../lib/ensure-wallet";

export const dynamic = "force-dynamic";

/**
 * Shared shell layout. Every protected route lives under `app/(shell)/*`
 * and inherits this header. Server-only:
 *   - reads userId via Clerk `auth()` (middleware has already gated)
 *   - provisions a wallet on first sign-in (idempotent)
 *   - reads the wallet's plan + credits + state for the header
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    // Defence in depth — middleware should have redirected already.
    throw new Error("ShellLayout reached without a Clerk userId");
  }

  const wallet = await ensureWallet(userId);
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <Header
        plan={wallet.plan}
        credits={wallet.creditsRemaining}
        {...(email !== undefined ? { email } : {})}
      />
      <main className="mx-auto max-w-screen-xl px-6 py-8">{children}</main>
    </div>
  );
}
