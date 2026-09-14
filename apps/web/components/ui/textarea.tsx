import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-[#8b837c] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#ddd6fe]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
