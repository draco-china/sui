import type { ReactNode } from "react";

/** A field's label inside its trigger, before the value. */
export function ValuePrefix({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <span className="shrink-0 whitespace-nowrap text-muted-foreground">
      {children}
    </span>
  );
}
