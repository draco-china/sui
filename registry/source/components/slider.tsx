"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";
import type { ComponentProps } from "react";
import { withGlass } from "@/lib/glass/with-glass";

// With `glass`, as on Apple platforms, a thumb becomes a clear glass lens only
// while dragged; a lens sits on glass, so it also works inside a layer.
// It grows in layout rather than by transform: scaled SVG backdrops misplace refraction.
// The lens drops its paint instantly: a fading fill would cover the refraction.
const GlassThumb = withGlass((props: ComponentProps<"div">) => (
  <div data-glass-lens="" {...props} />
));

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  glass: lens = false,
  ...props
}: SliderPrimitive.Root.Props & { glass?: boolean }) {
  const values = value ?? defaultValue ?? min;
  const thumbCount = Array.isArray(values) ? values.length : 1;

  return (
    <SliderPrimitive.Root
      className={cn("data-vertical:h-full data-horizontal:w-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none select-none items-center data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow select-none overflow-hidden rounded-full bg-input/90 data-horizontal:h-2 data-vertical:h-full data-horizontal:w-full data-vertical:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="select-none bg-primary data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            aria-label={props["aria-label"]}
            aria-labelledby={props["aria-labelledby"]}
            aria-describedby={props["aria-describedby"]}
            // biome-ignore lint/suspicious/noArrayIndexKey: Thumb identity is its position; using its changing value would remount it while dragging.
            key={index}
            index={index}
            render={(thumbProps, state) => (
              <GlassThumb
                {...thumbProps}
                glass={
                  lens &&
                  state.dragging &&
                  // Base UI marks the active thumb on focus; a lone thumb is
                  // always the one being dragged.
                  (thumbCount === 1 || state.activeThumbIndex === index)
                }
              />
            )}
            className="block h-4 w-6 shrink-0 select-none rounded-full bg-white not-dark:bg-clip-padding shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] hover:ring-4 hover:ring-ring/30 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 data-vertical:data-[glass=true]:h-7.5 data-vertical:data-[glass=true]:w-5.5 data-[glass=true]:h-5.5 data-vertical:h-6 data-[glass=true]:w-7.5 data-vertical:w-4 data-[glass=true]:bg-transparent! data-[glass=true]:ring-0 data-[glass=true]:transition-none"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
