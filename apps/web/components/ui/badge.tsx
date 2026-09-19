import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface text-foreground/80",
        primary: "border-primary/30 bg-primary/10 text-primary dark:text-indigo-300",
        warm: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
