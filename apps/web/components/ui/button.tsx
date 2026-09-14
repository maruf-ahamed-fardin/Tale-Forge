import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[#4338ca] focus-visible:outline-primary",
        secondary:
          "bg-[#f4f1ec] text-[#292524] hover:bg-[#e9e2d8] focus-visible:outline-[#a8a29e]",
        outline:
          "border border-border bg-surface text-[#292524] hover:bg-[#f7f4ef] focus-visible:outline-[#a8a29e]",
        ghost:
          "text-[#44403c] hover:bg-[#f4f1ec] focus-visible:outline-[#a8a29e]",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";
