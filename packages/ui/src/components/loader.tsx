"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { type CSSProperties, useEffect, useId, useState } from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";

const loaderVariantNames = [
  "spinner",
  "dash-ring",
  "dots",
  "bars",
  "dot-matrix",
  "dither",
  "ascii",
  "ascii-line",
  "ascii-braille",
  "ascii-blocks",
  "ascii-bounce",
  "morph",
  "comet",
  "scramble",
  "metaballs",
  "newton",
  "helix",
  "percent",
] as const;
const loaderVariants = cva(
  "inline-flex size-(--loader-size) shrink-0 items-center justify-center text-current motion-reduce:[&_*]:animate-none!",
  {
    variants: {
      variant: {
        spinner:
          "[&_[data-slot=loader-spin]]:animate-[loader-spin_var(--loader-cycle)_linear_infinite]",
        "dash-ring":
          "[&_[data-slot=loader-dash-ring]]:animate-[loader-spin_calc(var(--loader-cycle)*1.8)_linear_infinite] [&_[data-slot=loader-dash]]:animate-[loader-dash_calc(var(--loader-cycle)*1.4)_ease-in-out_infinite]",
        dots: "[&_[data-slot=loader-dot]]:animate-[loader-dot_var(--loader-cycle)_ease-in-out_infinite_both]",
        bars: "[&_[data-slot=loader-bar]]:animate-[loader-bar_var(--loader-cycle)_ease-in-out_infinite_both]",
        "dot-matrix":
          "[&_[data-slot=loader-matrix-cell]]:animate-[loader-matrix_var(--loader-cycle)_ease-in-out_infinite_both]",
        dither:
          "[&_[data-slot=loader-dither-cell]]:animate-[loader-opacity_var(--loader-cycle)_ease-in-out_infinite_both]",
        ascii: null,
        "ascii-line": null,
        "ascii-braille": null,
        "ascii-blocks": null,
        "ascii-bounce": null,
        morph:
          "[&_[data-slot=loader-morph]]:animate-[loader-morph-shape_calc(var(--loader-cycle)*5)_ease-in-out_infinite,loader-morph-pose_calc(var(--loader-cycle)*5)_ease-in-out_infinite]",
        comet:
          "[&_[data-slot=loader-spin]]:animate-[loader-spin_var(--loader-cycle)_linear_infinite]",
        scramble: "[width:calc(var(--loader-size)*2.4)]",
        metaballs:
          "[&_[data-slot=loader-metaball-first]]:animate-[loader-metaball-first_calc(var(--loader-cycle)*1.6)_ease-in-out_infinite] [&_[data-slot=loader-metaball-second]]:animate-[loader-metaball-second_calc(var(--loader-cycle)*1.6)_ease-in-out_infinite]",
        newton:
          "[&_[data-slot=loader-newton-left]]:animate-[loader-newton-left_calc(var(--loader-cycle)*1.6)_ease-in-out_infinite] [&_[data-slot=loader-newton-right]]:animate-[loader-newton-right_calc(var(--loader-cycle)*1.6)_ease-in-out_infinite]",
        helix:
          "[&_[data-slot=loader-helix-left]]:animate-[loader-helix-left_calc(var(--loader-cycle)*1.5)_ease-in-out_infinite_both] [&_[data-slot=loader-helix-right]]:animate-[loader-helix-right_calc(var(--loader-cycle)*1.5)_ease-in-out_infinite_both]",
        percent: "[width:calc(var(--loader-size)*1.5)]",
      },
      size: {
        sm: "[--loader-size:16px]",
        default: "[--loader-size:20px]",
        lg: "[--loader-size:28px]",
      },
    },
    defaultVariants: { variant: "spinner", size: "default" },
  },
);
type LoaderVariant = (typeof loaderVariantNames)[number];
type LoaderProps = Omit<useRender.ComponentProps<"span">, "children"> & {
  variant?: NonNullable<VariantProps<typeof loaderVariants>["variant"]>;
  size?: "sm" | "default" | "lg" | number;
  /** A base animation cycle in seconds. */
  speed?: number;
  label?: string;
};
type VisualProps = { size: number; cycle: number; reduce: boolean };
type LoaderStyle = CSSProperties & {
  "--loader-size"?: string;
  "--loader-cycle": string;
};
const glyphs: Partial<Record<LoaderVariant, readonly string[]>> = {
  ascii: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  "ascii-line": ["|", "/", "-", "\\"],
  "ascii-braille": ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  "ascii-blocks": [
    "▁",
    "▂",
    "▃",
    "▄",
    "▅",
    "▆",
    "▇",
    "█",
    "▇",
    "▆",
    "▅",
    "▄",
    "▃",
    "▂",
  ],
  "ascii-bounce": ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
};

function useFrame(periodMs: number, reduce: boolean) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(
      () => setFrame((previous) => previous + 1),
      Math.max(10, periodMs),
    );
    return () => clearInterval(timer);
  }, [periodMs, reduce]);
  return reduce ? 0 : frame;
}

function Loader({
  variant = "spinner",
  size = "default",
  speed = 1,
  label = "Loading",
  className,
  style,
  render,
  ...props
}: LoaderProps) {
  const reduce = useReducedMotion();
  let pixels = 20;
  if (typeof size === "number") {
    if (Number.isFinite(size)) pixels = Math.min(4096, Math.max(8, size));
  } else {
    pixels = { sm: 16, default: 20, lg: 28 }[size] ?? 20;
  }
  const cycle = Number.isFinite(speed)
    ? Math.min(86400, Math.max(0.1, speed))
    : 1;
  const loaderStyle: LoaderStyle = {
    ...(typeof size === "number" && { "--loader-size": `${pixels}px` }),
    "--loader-cycle": `${cycle}s`,
    ...style,
  };
  return useRender({
    defaultTagName: "span",
    render,
    state: { slot: "loader", variant },
    props: mergeProps<"span">(
      {
        role: "status",
        "aria-label": label,
        className: loaderVariants({
          variant,
          size: typeof size === "number" ? "default" : size,
          className,
        }),
        style: loaderStyle,
        children: (
          <span
            aria-hidden="true"
            className="relative inline-flex size-full items-center justify-center"
          >
            <LoaderVisual
              variant={variant}
              size={pixels}
              cycle={cycle}
              reduce={reduce}
            />
          </span>
        ),
      },
      props,
    ),
  });
}

function LoaderVisual({
  variant,
  ...props
}: VisualProps & { variant: LoaderVariant }) {
  const frames = glyphs[variant];
  if (frames) return <GlyphSequence {...props} frames={frames} />;
  switch (variant) {
    case "spinner":
      return <SpinnerVisual size={props.size} />;
    case "dash-ring":
      return <DashRing size={props.size} />;
    case "dots":
      return <Dots {...props} />;
    case "bars":
      return <Bars {...props} />;
    case "dot-matrix":
      return <Matrix {...props} dither={false} />;
    case "dither":
      return <Matrix {...props} dither />;
    case "morph":
      return (
        <span
          data-slot="loader-morph"
          className="size-full bg-current"
          style={{
            clipPath:
              "polygon( 50.00% 4.00%, 61.91% 5.57%, 73.00% 10.16%, 82.53% 17.47%, 89.84% 27.00%, 94.43% 38.09%, 96.00% 50.00%, 94.43% 61.91%, 89.84% 73.00%, 82.53% 82.53%, 73.00% 89.84%, 61.91% 94.43%, 50.00% 96.00%, 38.09% 94.43%, 27.00% 89.84%, 17.47% 82.53%, 10.16% 73.00%, 5.57% 61.91%, 4.00% 50.00%, 5.57% 38.09%, 10.16% 27.00%, 17.47% 17.47%, 27.00% 10.16%, 38.09% 5.57% )",
          }}
        />
      );
    case "comet":
      return <Comet {...props} />;
    case "scramble":
      return <Scramble {...props} />;
    case "metaballs":
      return <Metaballs />;
    case "newton":
      return <Newton {...props} />;
    case "helix":
      return <Helix {...props} />;
    case "percent":
      return <Percent {...props} />;
    default:
      return <SpinnerVisual size={props.size} />;
  }
}

function SpinnerVisual({ size }: { size: number }) {
  const stroke = (Math.max(2, size / 10) * 40) / size;
  return (
    <svg
      aria-hidden="true"
      data-slot="loader-spin"
      className="size-full"
      viewBox="0 0 40 40"
      fill="none"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        stroke="currentColor"
        strokeWidth={stroke}
        opacity="0.2"
      />
      <path
        d="M20 4a16 16 0 0 1 16 16"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
function DashRing({ size }: { size: number }) {
  const stroke = Math.min(8, (Math.max(2, size / 10) * 40) / size);
  return (
    <svg
      aria-hidden="true"
      data-slot="loader-dash-ring"
      className="size-full origin-center [transform-box:view-box]"
      viewBox="0 0 40 40"
      fill="none"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        stroke="currentColor"
        strokeWidth={stroke}
        opacity="0.16"
      />
      <circle
        data-slot="loader-dash"
        cx="20"
        cy="20"
        r="16"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="25 75"
        strokeDashoffset={0}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}
function Dots({ size, cycle }: VisualProps) {
  const dot = size * 0.22;
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: dot * 0.65, height: size }}
    >
      {["first", "middle", "last"].map((id, index) => (
        <span
          key={id}
          data-slot="loader-dot"
          className="rounded-full bg-current"
          style={{
            width: dot,
            height: dot,
            animationDelay: `${(index * cycle) / 6}s`,
          }}
        />
      ))}
    </span>
  );
}
function Bars({ size, cycle }: VisualProps) {
  const width = size / 7;
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: width * 0.65, height: size }}
    >
      {["first", "second", "third", "fourth"].map((id, index) => (
        <span
          key={id}
          data-slot="loader-bar"
          className="rounded-full bg-current"
          style={{
            width,
            height: size,
            animationDelay: `${(index * cycle) / 7}s`,
          }}
        />
      ))}
    </span>
  );
}
function Matrix({ size, cycle, dither }: VisualProps & { dither: boolean }) {
  const count = dither ? 4 : 3;
  const gap = size * (dither ? 0.06 : 0.12);
  const cell = (size - gap * (count - 1)) / count;
  const cells = Array.from({ length: count * count }, (_, index) => ({
    id: `row-${Math.floor(index / count)}-column-${index % count}`,
    row: Math.floor(index / count),
    column: index % count,
  }));
  return (
    <span
      className="grid"
      style={{ gap, gridTemplateColumns: `repeat(${count}, ${cell}px)` }}
    >
      {cells.map(({ id, row, column }) => (
        <span
          key={id}
          data-slot={dither ? "loader-dither-cell" : "loader-matrix-cell"}
          className={cn("bg-current", !dither && "rounded-full")}
          style={{
            width: cell,
            height: cell,
            animationDelay: `${((dither ? (row * 3 + column * 5) % 16 : row + column) * cycle) / (dither ? 16 : 8)}s`,
          }}
        />
      ))}
    </span>
  );
}
function GlyphSequence({
  frames,
  size,
  cycle,
  reduce,
}: VisualProps & { frames: readonly string[] }) {
  const frame = useFrame((cycle * 1000) / frames.length, reduce);
  return (
    <span
      className="font-mono tabular-nums leading-none"
      style={{ fontSize: size }}
    >
      {frames[frame % frames.length]}
    </span>
  );
}
function Comet({ size }: VisualProps) {
  const radius = size * 0.4;
  return (
    <span data-slot="loader-spin" className="relative inline-block size-full">
      {["head", "one", "two", "three", "four", "five", "tail"].map(
        (id, index) => {
          const angle = index * 0.18 - Math.PI / 2;
          const diameter = Math.max(2, size * (0.17 - index * 0.017));
          return (
            <span
              key={id}
              className="absolute rounded-full bg-current"
              style={{
                width: diameter,
                height: diameter,
                left:
                  Math.round(
                    (size / 2 + Math.cos(angle) * radius - diameter / 2) * 100,
                  ) / 100,
                top:
                  Math.round(
                    (size / 2 + Math.sin(angle) * radius - diameter / 2) * 100,
                  ) / 100,
                opacity: 1 - index * 0.13,
              }}
            />
          );
        },
      )}
    </span>
  );
}
function Scramble({ size, cycle, reduce }: VisualProps) {
  const frame = useFrame((cycle * 1000) / 9, reduce);
  const target = "LOADING";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@*";
  const text = reduce
    ? target
    : Array.from(target, (letter, index) =>
        frame % 9 > index
          ? letter
          : alphabet[(frame * 7 + index * 11) % alphabet.length],
      ).join("");
  return (
    <span className="font-mono" style={{ fontSize: size * 0.48 }}>
      {text}
    </span>
  );
}
function Metaballs() {
  const filterId = useId();
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      viewBox="0 0 100 100"
      fill="currentColor"
    >
      <defs>
        <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="soft" />
          <feColorMatrix
            in="soft"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
          />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <circle data-slot="loader-metaball-first" cy="50" cx="32" r="18" />
        <circle data-slot="loader-metaball-second" cy="50" cx="68" r="18" />
      </g>
    </svg>
  );
}
function Newton({ size }: VisualProps) {
  const ball = size * 0.16;
  return (
    <span className="inline-flex items-start" style={{ height: size }}>
      {["left", "inner-left", "center", "inner-right", "right"].map((id) => (
        <span
          key={id}
          data-slot={`loader-newton-${id}`}
          className="relative inline-flex justify-center"
          style={{ width: ball, height: size, transformOrigin: "top center" }}
        >
          <span className="absolute top-0 h-3/4 w-px bg-current/40" />
          <span
            className="absolute bottom-0 rounded-full bg-current"
            style={{ width: ball, height: ball }}
          />
        </span>
      ))}
    </span>
  );
}
function Helix({ size, cycle }: VisualProps) {
  const dot = size * 0.14;
  const strands = Array.from({ length: 8 }, (_, index) => ({
    id: `row-${Math.floor(index / 2)}-${index % 2 ? "right" : "left"}`,
    row: Math.floor(index / 2),
    right: Boolean(index % 2),
  }));
  return (
    <span className="relative inline-block size-full">
      {strands.map(({ id, row, right }) => (
        <span
          key={id}
          data-slot={right ? "loader-helix-right" : "loader-helix-left"}
          className="absolute rounded-full bg-current"
          style={{
            width: dot,
            height: dot,
            top: (row * size) / 4,
            left: right ? size * 0.68 : size * 0.18,
            animationDelay: `${(row * cycle) / 8}s`,
          }}
        />
      ))}
    </span>
  );
}
function Percent({ size, cycle, reduce }: VisualProps) {
  const frame = useFrame(cycle * 10, reduce);
  const percentage = frame % 101;
  return (
    <span
      className="inline-flex flex-col items-center gap-1"
      style={{ width: size * 1.5 }}
    >
      <span
        className="font-mono tabular-nums leading-none"
        style={{ fontSize: size * 0.46 }}
      >
        {percentage}%
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-current/20">
        <span
          className="block h-full rounded-full bg-current"
          style={{ width: `${percentage}%` }}
        />
      </span>
    </span>
  );
}

export type { LoaderProps, LoaderVariant };
export { Loader, loaderVariantNames, loaderVariants };
