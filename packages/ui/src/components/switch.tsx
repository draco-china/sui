"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { type ComponentProps, useContext, useEffect, useState } from "react";
import { mergeClassNames } from "../lib/class-name";
import { GlassContext, withGlass } from "../lib/glass/context";

// As on Apple platforms, the thumb becomes a clear glass lens only while pressed.
// It grows in layout rather than by transform: scaled SVG backdrops misplace
// refraction. Margins keep its center, since the checked offset follows its width.
// The lens drops its paint instantly: a fading fill would cover the refraction.
const GlassThumb = withGlass(
  (props: ComponentProps<"span">) => <span {...props} />,
  "control",
  { material: "clear" },
);

function SwitchImplementation({
  className,
  size = "default",
  onPointerDown,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  const glass = useContext(GlassContext);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!pressed) return;
    const release = () => setPressed(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pressed]);
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={mergeClassNames(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border-2 outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 group-has-[:focus-visible]/field-label:ring-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-5 data-[size=sm]:h-4 data-[size=default]:w-11 data-[size=sm]:w-7 data-disabled:cursor-not-allowed data-checked:border-primary data-unchecked:border-transparent data-checked:bg-primary data-unchecked:bg-input/90 data-disabled:opacity-50 group-has-[:focus-visible]/field-label:data-checked:border-primary group-has-[:focus-visible]/field-label:data-unchecked:border-transparent dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!props.disabled && !props.readOnly) setPressed(true);
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        render={
          <GlassThumb glass={pressed && glass.enabled && !glass.content} />
        }
        className="pointer-events-none block rounded-full bg-background not-dark:bg-clip-padding shadow-sm ring-0 transition-[translate,background-color] data-checked:data-[glass=true]:ms-[-9px] data-[glass=true]:-mx-[3px] data-checked:translate-x-[calc(100%-8px)] data-unchecked:translate-x-0 data-[glass=true]:bg-transparent! data-checked:bg-primary-foreground data-[glass=true]:transition-[translate] group-data-[size=default]/switch:h-4 group-data-[size=sm]/switch:h-3 group-data-[size=default]/switch:w-6 group-data-[size=sm]/switch:w-4 group-data-[size=default]/switch:data-[glass=true]:h-[22px] group-data-[size=sm]/switch:data-[glass=true]:h-[18px] group-data-[size=default]/switch:data-[glass=true]:w-[30px] group-data-[size=sm]/switch:data-[glass=true]:w-[22px] rtl:data-checked:-translate-x-[calc(100%-8px)] rtl:data-unchecked:-translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

const Switch = withGlass(SwitchImplementation, "scope");

export { Switch };
