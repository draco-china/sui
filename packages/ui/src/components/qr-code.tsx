"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import { CircleAlertIcon } from "lucide-react";
import {
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { GlassContext, type GlassProps, withGlass } from "../lib/glass/context";
import { applyQRCodeFinderGeometry } from "../lib/qr-code/finder";

type QRCodeProps = Omit<useRender.ComponentProps<"div">, "children"> &
  GlassProps & {
    value?: string;
    loading?: boolean;
    animated?: boolean;
    label?: string;
    margin?: number;
    logo?: ReactNode;
    size?: number;
  };
const qrCodeVariants = cva(
  "relative isolate mx-auto aspect-square w-full overflow-hidden rounded-xl bg-card text-foreground",
);

type Dot = {
  x: number;
  y: number;
  from: number;
  to: number;
  start: number;
  hold: number;
  value: number;
  rising: boolean;
};

function mountDotMatrix(
  canvas: HTMLCanvasElement,
  moduleSize: number,
  paused: boolean,
) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;
  const duration = 400;
  const enterDuration = 800;
  const blur = 10;
  const low = 0.05;
  const high = 0.5;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  let width = 0,
    height = 0,
    ratio = 0,
    frame = 0,
    last = 0,
    elapsed = 0,
    reveal = 0;
  let dots: Dot[] = [],
    disposed = false;
  const random = () => low + Math.random() * (high - low);
  const peak = () => low + (high - low) * (0.75 + Math.random() * 0.25);
  const hold = () => 120 + Math.random() * 400;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const isStatic = () => motion.matches || paused;

  function size() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (bounds.width === width && bounds.height === height && dpr === ratio)
      return;
    const gap = Math.max(2, (moduleSize * bounds.width) / 256);
    const changed = bounds.width !== width || bounds.height !== height;
    width = bounds.width;
    height = bounds.height;
    ratio = dpr;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (changed) {
      // Preserve existing cells' phases across resizes; new cells get independent phases.
      const previous = new Map(dots.map((dot) => [`${dot.x},${dot.y}`, dot]));
      dots = [];
      // Place dots on every edge; the QR container clips the rounded corners.
      const rows = Math.max(1, Math.ceil(height / gap));
      const columns = Math.max(1, Math.ceil(width / gap));
      for (let row = 0; row <= rows; row++) {
        const y = (row * height) / rows;
        for (let column = 0; column <= columns; column++) {
          const x = (column * width) / columns;
          const initial = random();
          const rising = Math.random() > 0.5;
          dots.push(
            previous.get(`${x},${y}`) ?? {
              x,
              y,
              from: rising ? low : peak(),
              to: rising ? peak() : low,
              start: elapsed - Math.random() * duration,
              hold: hold(),
              value: initial,
              rising,
            },
          );
        }
      }
    }
  }

  function draw() {
    // CSS resolves currentColor / var() / modern color syntax for Canvas, including alpha.
    const color = getComputedStyle(canvas).color;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    for (const dot of dots) {
      if (!isStatic()) {
        const progress = Math.min(
          1,
          Math.max(
            0,
            (elapsed - dot.start - dot.hold) /
              (duration * (dot.rising ? 2 : 1)),
          ),
        );
        dot.value = dot.from + (dot.to - dot.from) * smooth(progress);
        if (progress === 1) {
          dot.from = dot.to;
          dot.rising = !dot.rising;
          dot.to = dot.rising ? peak() : low;
          dot.start = elapsed;
          dot.hold = hold();
        }
      }
      // A restrained shared breath gives the independent pulses a readable rhythm.
      const breath = isStatic()
        ? 1
        : 0.875 - 0.125 * Math.cos((elapsed * Math.PI * 2) / 4200);
      ctx.globalAlpha = dot.value * breath;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, (moduleSize * width) / 1024, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const t = isStatic() ? 1 : Math.min(1, reveal / enterDuration);
    const eased = 1 - (1 - t) ** 3;
    canvas.style.opacity = String(eased);
    canvas.style.filter = t === 1 ? "none" : `blur(${blur * (1 - eased)}px)`;
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.max(0, now - last) : 0;
    last = now;
    elapsed += dt;
    reveal += dt;
    size();
    draw();
    if (!isStatic() && width > 0 && height > 0)
      frame = requestAnimationFrame(tick);
  }
  function invalidate() {
    if (!disposed && !frame && !document.hidden)
      frame = requestAnimationFrame(tick);
  }
  function preference() {
    last = 0;
    // Never replay the decorative entrance when an OS preference changes.
    if (motion.matches) reveal = enterDuration;
    invalidate();
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    invalidate();
  }
  const resize = new ResizeObserver(() => {
    size();
    invalidate();
  });
  resize.observe(canvas);
  // Observe only ancestors, so our own per-frame opacity/filter writes cannot loop.
  // Also redraw static mode when the host switches theme via class/style/data-theme.
  const theme = new MutationObserver(invalidate);
  for (let node = canvas.parentElement; node; node = node.parentElement) {
    theme.observe(node, { attributes: true });
  }
  let resolution = matchMedia(
    `(resolution: ${window.devicePixelRatio || 1}dppx)`,
  );
  function dpi() {
    resolution.removeEventListener("change", dpi);
    resolution = matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );
    resolution.addEventListener("change", dpi);
    invalidate();
  }
  resolution.addEventListener("change", dpi);
  motion.addEventListener("change", preference);
  scheme.addEventListener("change", invalidate);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("resize", invalidate);
  size();
  draw();
  invalidate();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    theme.disconnect();
    resolution.removeEventListener("change", dpi);
    motion.removeEventListener("change", preference);
    scheme.removeEventListener("change", invalidate);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", invalidate);
  };
}

function DotMatrix({
  moduleSize = 12,
  paused,
}: {
  moduleSize?: number;
  paused: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<SVGSVGElement>(null);
  const patternId = useId();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.getContext("2d")) return;
    const cleanup = mountDotMatrix(canvas, moduleSize, paused);
    const fallback = fallbackRef.current;
    if (fallback) fallback.style.visibility = "hidden";
    return () => {
      cleanup();
      if (fallback) fallback.style.visibility = "visible";
    };
  }, [moduleSize, paused]);
  return (
    <>
      <svg
        ref={fallbackRef}
        aria-hidden="true"
        viewBox="0 0 256 256"
        className="pointer-events-none absolute inset-0 block size-full text-foreground/12"
      >
        <defs>
          <pattern
            id={patternId}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="0" cy="0" r="2.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="256" height="256" fill={`url(#${patternId})`} />
      </svg>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 block size-full"
      />
    </>
  );
}

function QRCode(props: QRCodeProps) {
  return (
    <DecoratedQRCode
      key={JSON.stringify([props.value ?? "", props.size, props.margin])}
      {...props}
    />
  );
}
function QRCodeContent({
  value,
  loading = false,
  animated = false,
  label = "QR code",
  margin = 16,
  logo,
  size = 256,
  className,
  style,
  render,
  ...props
}: QRCodeProps) {
  const glassEnabled = useContext(GlassContext).enabled;
  const pixels = Number.isFinite(size)
    ? Math.min(1024, Math.max(64, size))
    : 256;
  const quietZone = Math.min(
    pixels / 2 - 4,
    Math.max(0, Number.isFinite(margin) ? margin : 16),
  );
  const [result, setResult] = useState<{
    value: string;
    url?: string;
    error?: boolean;
    moduleSize?: number;
  }>();
  const [decoded, setDecoded] = useState(false);
  const [settled, setSettled] = useState(false);
  const reduced = useReducedMotion();
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const maskId = useId();
  const codeMaskId = useId();
  const titleId = useId();
  useEffect(() => {
    if (!value) return;
    let active = true;
    let objectUrl: string | undefined;
    void (async () => {
      try {
        const { default: QRCodeStyling } = await import("qr-code-styling");
        const code = new QRCodeStyling({
          type: "svg",
          width: 512,
          height: 512,
          // This encoder's Byte mode accepts a byte string, so preserve UTF-8
          // instead of truncating each Unicode code point to its low byte.
          data: Array.from(new TextEncoder().encode(value), (byte) =>
            String.fromCharCode(byte),
          ).join(""),
          margin: (quietZone / pixels) * 512,
          qrOptions: { errorCorrectionLevel: "H", mode: "Byte" },
          dotsOptions: { type: "extra-rounded", color: "#FFFFFF" },
          cornersSquareOptions: { type: "extra-rounded", color: "#FFFFFF" },
          cornersDotOptions: { type: "square", color: "#FFFFFF" },
          backgroundOptions: { color: "#FFFFFF00" },
        });
        let moduleSize = 12;
        code.applyExtension((svg) => {
          moduleSize = applyQRCodeFinderGeometry(svg);
        });
        const blob = await code.getRawData("svg");
        if (!active) return;
        if (!(blob instanceof Blob)) throw new Error("QR generation failed");
        objectUrl = URL.createObjectURL(blob);
        setResult({ value, url: objectUrl, moduleSize });
      } catch {
        if (active) setResult({ value, error: true });
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value, quietZone, pixels]);
  const current = result?.value === value ? result : undefined;
  const revealed = !loading && decoded && Boolean(current?.url);
  const failed = !loading && current?.error;
  const ready = revealed && (!animated || settled);
  useEffect(() => {
    if (!revealed) {
      setSettled(false);
      return;
    }
    if (!animated || reduced) {
      setSettled(true);
      return;
    }
    let frame = 0;
    let started: number | undefined;
    let active = true;
    const draw = (now: number) => {
      if (!active) return;
      started ??= now;
      const progress = Math.min(1, (now - started) / 750);
      const eased = 1 - (1 - progress) ** 3;
      lineRefs.current.forEach((line, row) => {
        const origin = 16 + ((row * 137) % 480);
        line?.setAttribute("x1", String(origin * (1 - eased)));
        line?.setAttribute("x2", String(origin + (512 - origin) * eased));
      });
      if (progress === 1) setSettled(true);
      else frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [revealed, animated, reduced]);
  let state = "loading";
  if (failed) state = "error";
  else if (ready) state = "ready";
  return useRender({
    defaultTagName: "div",
    render,
    state: {
      slot: "qr-code",
      state,
    },
    props: mergeProps<"div">(
      {
        "aria-busy": !ready && !failed,
        className: cn(qrCodeVariants(), className),
        style: { width: pixels, maxWidth: "100%", ...style },
        children: (
          <div
            data-slot="qr-code-content"
            className={cn(
              "absolute inset-0 overflow-hidden rounded-[inherit] text-foreground",
              glassEnabled ? "bg-transparent" : "bg-card",
            )}
          >
            {!ready && !failed && (
              <div
                data-slot="qr-code-loading"
                role="status"
                aria-label={label}
                className="pointer-events-none absolute inset-0"
              >
                <DotMatrix moduleSize={current?.moduleSize} paused={false} />
              </div>
            )}
            {current?.url && (
              <div
                aria-hidden={!ready}
                data-slot="qr-code-image"
                className={cn(
                  "pointer-events-none absolute inset-0",
                  animated &&
                    "transition-opacity duration-300 motion-reduce:transition-none",
                  revealed ? "opacity-100" : "opacity-0",
                )}
              >
                <svg
                  viewBox="0 0 512 512"
                  role="img"
                  aria-labelledby={titleId}
                  className="block size-full"
                >
                  <title id={titleId}>{label}</title>
                  <defs>
                    <mask
                      id={codeMaskId}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="512"
                      height="512"
                    >
                      <image
                        href={current.url}
                        width="512"
                        height="512"
                        onLoad={() => setDecoded(true)}
                        onError={() => {
                          setDecoded(false);
                          setResult({ value: value ?? "", error: true });
                        }}
                      />
                    </mask>
                  </defs>
                  {animated && (
                    <defs>
                      <mask
                        id={maskId}
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="512"
                        height="512"
                      >
                        {Array.from({ length: 16 }, (_, row) => ({
                          id: `row-${row}`,
                          row,
                          origin: 16 + ((row * 137) % 480),
                        })).map(({ id, row, origin }) => (
                          <line
                            key={id}
                            ref={(node) => {
                              lineRefs.current[row] = node;
                            }}
                            x1={origin}
                            x2={origin + 0.1}
                            y1={row * 32 + 16}
                            y2={row * 32 + 16}
                            stroke="#FFFFFF"
                            strokeWidth="34"
                            strokeLinecap="round"
                          />
                        ))}
                      </mask>
                    </defs>
                  )}
                  <g mask={animated && !ready ? `url(#${maskId})` : undefined}>
                    <rect
                      width="512"
                      height="512"
                      fill="currentColor"
                      mask={`url(#${codeMaskId})`}
                    />
                  </g>
                </svg>
                {logo && ready && (
                  <span
                    aria-hidden="true"
                    data-slot="qr-code-logo"
                    className="absolute top-1/2 left-1/2 flex size-[16%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-4 border-card bg-card text-foreground"
                  >
                    {logo}
                  </span>
                )}
              </div>
            )}
            {failed && (
              <span
                role="alert"
                className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm"
              >
                <CircleAlertIcon
                  aria-hidden="true"
                  className="size-6 text-foreground/50"
                />
                <span className="sr-only">Unable to generate QR code</span>
              </span>
            )}
          </div>
        ),
      },
      props,
    ),
  });
}

const DecoratedQRCode = withGlass(QRCodeContent);

export type { QRCodeProps };
export { QRCode, qrCodeVariants };
