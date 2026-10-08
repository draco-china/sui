"use client";

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import { buttonVariants } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { mergeClassNames } from "../lib/class-name";
import { withGlass } from "../lib/glass/context";

function ToolbarImplementation({
  className,
  orientation = "horizontal",
  ...props
}: ToolbarPrimitive.Root.Props) {
  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      data-orientation={orientation}
      orientation={orientation}
      className={mergeClassNames(
        "flex w-fit max-w-full items-center gap-1 rounded-[calc(var(--radius)+1.25rem+1px)] border border-border bg-background p-1 data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ToolbarButtonImplementation({
  className,
  variant = "ghost",
  size = "default",
  ...props
}: ToolbarPrimitive.Button.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-button"
      data-variant={variant}
      data-size={size}
      className={mergeClassNames(
        cn(
          buttonVariants({ variant, size }),
          "data-pressed:bg-accent data-pressed:text-accent-foreground data-disabled:opacity-50",
        ),
        className,
      )}
      {...props}
    />
  );
}

function ToolbarLinkImplementation({
  className,
  variant = "ghost",
  size = "default",
  ...props
}: ToolbarPrimitive.Link.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ToolbarPrimitive.Link
      data-slot="toolbar-link"
      data-variant={variant}
      data-size={size}
      className={mergeClassNames(
        cn(buttonVariants({ variant, size })),
        className,
      )}
      {...props}
    />
  );
}

function ToolbarInput({
  className,
  render = <Input />,
  ...props
}: ToolbarPrimitive.Input.Props) {
  return (
    <ToolbarPrimitive.Input
      data-slot="toolbar-input"
      render={render}
      className={mergeClassNames(
        "w-40 rounded-4xl data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ToolbarGroup({ className, ...props }: ToolbarPrimitive.Group.Props) {
  return (
    <ToolbarPrimitive.Group
      data-slot="toolbar-group"
      className={mergeClassNames(
        "flex items-center gap-1 data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ToolbarSeparator({
  className,
  ...props
}: ToolbarPrimitive.Separator.Props) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={mergeClassNames(
        "shrink-0 self-stretch bg-border data-[orientation=horizontal]:mx-1 data-[orientation=vertical]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-auto data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

const ToolbarLink = withGlass(ToolbarLinkImplementation, "control");

const Toolbar = withGlass(ToolbarImplementation);
const ToolbarButton = withGlass(ToolbarButtonImplementation, "control");

export {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
};
