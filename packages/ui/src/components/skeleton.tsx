"use client";

import { cn } from "cn";
import { withGlass } from "../lib/glass/context";

function SkeletonImplementation({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-muted", className)}
      {...props}
    />
  );
}

const Skeleton = withGlass(SkeletonImplementation);

export { Skeleton };
