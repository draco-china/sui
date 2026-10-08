import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { ComponentProps, ReactNode } from "react";

export type ButtonSize = NonNullable<ComponentProps<typeof Button>["size"]>;

export function TooltipButton({
  tooltip,
  ...props
}: ComponentProps<typeof Button> & { tooltip: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            {...props}
            aria-label={
              props["aria-label"] ??
              (typeof tooltip === "string" ? tooltip : undefined)
            }
          />
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
