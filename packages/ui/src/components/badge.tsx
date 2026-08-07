import { forwardRef, type ComponentProps } from "react";
import { cn } from "../lib/utils";

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground shadow-xs",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground shadow-xs",
  outline: "text-foreground border-input",
} as const;

export interface BadgeProps extends ComponentProps<"span"> {
  variant?: keyof typeof badgeVariants;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="badge"
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
