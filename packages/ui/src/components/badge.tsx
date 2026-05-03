import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--color-surface-strong)] text-[var(--color-body-strong)]",
        primary: "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
        up: "bg-[#e4f7ee] text-[var(--color-semantic-up)]",
        down: "bg-[#fbe6e8] text-[var(--color-semantic-down)]",
        warning: "bg-[#fef3d3] text-[#7a5500]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
