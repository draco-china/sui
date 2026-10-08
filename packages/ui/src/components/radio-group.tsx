"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { mergeClassNames } from "../lib/class-name";
import { withGlass } from "../lib/glass/context";

function RadioGroupImplementation({
  className,
  ...props
}: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={mergeClassNames("grid w-full gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItemImplementation({
  className,
  ...props
}: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={mergeClassNames(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-transparent bg-input/90 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute start-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground rtl:translate-x-1/2 dark:size-2.5" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

const RadioGroup = withGlass(RadioGroupImplementation, "scope");
const RadioGroupItem = withGlass(RadioGroupItemImplementation, "control");

export { RadioGroup, RadioGroupItem };
