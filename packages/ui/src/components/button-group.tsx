"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Separator } from "@workspace/ui/components/separator";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Children, type ComponentProps, isValidElement } from "react";
import { mergeClassNames } from "../lib/class-name";
import { type GlassProps, withGlass } from "../lib/glass/context";

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 data-[glass=true]:rounded-4xl has-[>[data-variant=outline]]:*:data-[slot=input-group]:border-border has-[>[data-variant=outline]]:*:data-[slot=select-trigger]:border-border has-[>[data-variant=outline]]:[&>[data-slot=input-group]:has(:focus-visible)]:border-ring has-[>[data-variant=outline]]:[&>[data-slot=select-trigger]:focus-visible]:border-ring has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-e-4xl [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit has-[>[data-variant=outline]]:[&>input:focus-visible]:border-ring [&>input]:flex-1 has-[>[data-variant=outline]]:[&>input]:border-border",
  {
    variants: {
      orientation: {
        horizontal: "",
        vertical: "flex-col",
      },
      // A group of groups only spaces them, so each inner group keeps its own
      // corners instead of being joined like a segment.
      nested: { true: "", false: "" },
    },
    compoundVariants: [
      {
        orientation: "horizontal",
        nested: false,
        className:
          "*:data-slot:rounded-e-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-e-4xl! [&>[data-slot]~[data-slot]]:rounded-s-none [&>[data-slot]~[data-slot]]:border-s-0",
      },
      {
        orientation: "vertical",
        nested: false,
        className:
          "*:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-4xl! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0",
      },
    ],
    defaultVariants: {
      orientation: "horizontal",
      nested: false,
    },
  },
);

function ButtonGroupImplementation({
  className,
  orientation,
  nested,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: This generic button group is not a form fieldset and accepts div props.
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation, nested }), className)}
      {...props}
    />
  );
}

// A glass group is one capsule whose buttons share its material, like grouped
// iOS toolbar items. A group of groups only lays them out, so each inner
// group keeps its own capsule.
const ButtonGroupSurface = withGlass(ButtonGroupImplementation);
const ButtonGroupScope = withGlass(ButtonGroupImplementation, "scope");

function ButtonGroup(
  props: Omit<ComponentProps<typeof ButtonGroupImplementation>, "nested"> &
    GlassProps,
) {
  const nested = Children.toArray(props.children).some(
    (child) => isValidElement(child) && child.type === ButtonGroup,
  );
  return nested ? (
    <ButtonGroupScope {...props} nested />
  ) : (
    <ButtonGroupSurface {...props} />
  );
}

function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-4xl border bg-muted px-2.5 font-medium text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "button-group-text",
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={mergeClassNames(
        "relative self-stretch bg-input data-horizontal:mx-px data-vertical:my-px data-vertical:h-auto data-horizontal:w-auto",
        className,
      )}
      {...props}
    />
  );
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
};
