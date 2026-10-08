import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";
import { withGlass } from "../lib/glass/context";

const GlassSliderTrack = withGlass(SliderPrimitive.Track, "control");
const GlassSliderThumb = withGlass(SliderPrimitive.Thumb, "control");

function SliderImplementation({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  let _values = [min, max];
  if (Array.isArray(value)) _values = value;
  else if (Array.isArray(defaultValue)) _values = defaultValue;

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
        <GlassSliderTrack
          data-slot="slider-track"
          className="relative grow select-none overflow-hidden rounded-full bg-input/90 data-horizontal:h-2 data-vertical:h-full data-horizontal:w-full data-vertical:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="select-none bg-primary data-horizontal:h-full data-vertical:w-full"
          />
        </GlassSliderTrack>
        {Array.from({ length: _values.length }, (_, index) => (
          <GlassSliderThumb
            data-slot="slider-thumb"
            // biome-ignore lint/suspicious/noArrayIndexKey: Thumb identity is its position; using its changing value would remount it while dragging.
            key={index}
            className="block h-4 w-6 shrink-0 select-none rounded-full bg-white not-dark:bg-clip-padding shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] hover:ring-4 hover:ring-ring/30 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 data-vertical:h-6 data-vertical:w-4"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

const Slider = withGlass(SliderImplementation, "scope");

export { Slider };
