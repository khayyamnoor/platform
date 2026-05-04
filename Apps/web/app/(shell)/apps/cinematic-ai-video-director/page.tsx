import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CinematicShell } from "../../../../components/cinematic-shell";
import { ensureWallet } from "../../../../lib/ensure-wallet";

export const dynamic = "force-dynamic";

export default async function CinematicPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const wallet = await ensureWallet(userId);

  return <CinematicShell state={wallet.state} credits={wallet.creditsRemaining} />;
}
