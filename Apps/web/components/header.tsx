import { UserButton } from "@clerk/nextjs";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@platform/ui";
import Link from "next/link";

type Plan = "FREE" | "STARTER_30" | "PRO_60" | "MAX_90";

const planLabel: Record<Plan, string> = {
  FREE: "Free",
  STARTER_30: "Starter",
  PRO_60: "Pro",
  MAX_90: "Max",
};

export type HeaderProps = {
  plan: Plan;
  credits: number;
  email?: string;
};

/**
 * Coinbase-themed shell header. Pure-presentational: takes wallet props,
 * renders the brand mark, plan badge, credit pill, and user dropdown.
 *
 * Consumed by `app/(shell)/layout.tsx`, which is the server component that
 * fetches wallet via `ensureWallet(auth().userId)` and feeds it in.
 */
export function Header({ plan, credits, email }: HeaderProps) {
  return (
    <header className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-display text-lg font-medium"
        >
          <span className="inline-block h-6 w-6 rounded-full bg-[var(--color-primary)]" />
          Platform
        </Link>

        <div className="flex items-center gap-3">
          <Badge
            variant={plan === "FREE" ? "neutral" : "primary"}
            aria-label={`Plan: ${planLabel[plan]}`}
          >
            {planLabel[plan]}
          </Badge>

          <span
            className="inline-flex h-8 items-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 text-xs font-medium text-[var(--color-ink)]"
            aria-label={`Credits remaining: ${credits}`}
          >
            {credits.toLocaleString()} credits
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {email && (
                <>
                  <DropdownMenuLabel className="truncate" title={email}>
                    {email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/sign-out">Sign out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export type { Plan };
