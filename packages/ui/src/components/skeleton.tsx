import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils.js";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-strong)]",
        className,
      )}
      {...props}
    />
  );
}
