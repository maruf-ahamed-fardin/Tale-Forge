import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface text-[#44403c]",
        primary: "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]",
        warm: "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]",
        green: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
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
