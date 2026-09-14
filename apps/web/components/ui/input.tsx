import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none transition-colors placeholder:text-[#8b837c] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#ddd6fe]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
