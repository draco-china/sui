"use client";

import { cn } from "cn";
import { ImageOff } from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { GlassProps } from "@/lib/glass/with-glass";
import { useImageGroup } from "@/components/ui/image/group";
import { type ImageLabelOverrides, imageLabels } from "@/components/ui/image/labels";
import { ImagePreview } from "@/components/ui/image/preview";

export interface ImagePreviewConfig {
  /** A larger image to preview instead of `src`. */
  readonly src?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly container?: ComponentProps<typeof ImagePreview>["container"];
}

export interface ImageProps
  extends Omit<ComponentProps<"img">, "src" | "alt" | "width" | "height">,
    GlassProps {
  readonly src: string;
  readonly alt: string;
  readonly width?: number | string;
  readonly height?: number | string;
  /** How the image fills its box. Defaults to `cover`. */
  readonly fit?: CSSProperties["objectFit"];
  /** Shown when the image fails to load. */
  readonly fallback?: ReactNode;
  /**
   * Opens a fullscreen preview on click. Inside ImageGroup, images take
   * part unless this is `false`.
   */
  readonly preview?: boolean | ImagePreviewConfig;
  readonly labels?: ImageLabelOverrides;
}

type LoadState = "loading" | "ready" | "error";

function previewConfig(preview: ImageProps["preview"]) {
  if (typeof preview === "object") return preview;
  return {};
}

function cssSize(size: number | string | undefined) {
  if (typeof size === "number") return `${size}px`;
  return size;
}

function DefaultFallback({ label }: Readonly<{ label: string }>) {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-1 bg-muted p-2 text-center text-muted-foreground text-xs">
      <ImageOff aria-hidden="true" className="size-5" />
      {label}
    </span>
  );
}

export function Image({
  src,
  alt,
  width,
  height,
  fit = "cover",
  fallback,
  preview,
  labels,
  glass,
  frosted,
  className,
  style,
  onLoad,
  onError,
  ...props
}: Readonly<ImageProps>) {
  const text = { ...imageLabels, ...labels };
  const group = useImageGroup();
  const config = previewConfig(preview);
  const grouped = group !== null && preview !== false;
  const previewable = grouped || Boolean(preview);
  const previewSrc = config.src ?? src;

  const [load, setLoad] = useState<{ src: string; state: LoadState }>({
    src,
    state: "loading",
  });
  let state: LoadState = "loading";
  if (load.src === src) state = load.state;
  const imageRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<HTMLElement>(null);

  // A cached image can finish before hydration attaches onLoad.
  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    setLoad({ src, state: image.naturalWidth > 0 ? "ready" : "error" });
  }, [src]);

  const id = useId();
  const register = group?.register;
  useEffect(() => {
    if (!grouped || !register) return;
    return register(id, { src: previewSrc, alt, element: boxRef });
  }, [grouped, register, id, previewSrc, alt]);

  const [localOpen, setLocalOpen] = useState(config.defaultOpen ?? false);
  const open = config.open ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    config.onOpenChange?.(next);
  };
  const show = () => {
    if (grouped) group?.show(id);
    else setOpen(true);
  };

  const content = (
    <>
      {state === "loading" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-muted motion-reduce:animate-none"
        />
      )}
      {state === "error" &&
        (fallback ?? <DefaultFallback label={text.error} />)}
      <img
        {...props}
        ref={imageRef}
        src={src}
        alt={alt}
        onLoad={(event) => {
          setLoad({ src, state: "ready" });
          onLoad?.(event);
        }}
        onError={(event) => {
          setLoad({ src, state: "error" });
          onError?.(event);
        }}
        className={cn(
          "size-full",
          state === "error" && "absolute size-px opacity-0",
        )}
        style={{ objectFit: fit }}
      />
    </>
  );
  const boxClass = cn(
    "relative inline-flex overflow-hidden align-middle",
    className,
  );
  const boxStyle = { width: cssSize(width), height: cssSize(height), ...style };

  if (!previewable)
    return (
      <span
        ref={(node) => {
          boxRef.current = node;
        }}
        data-slot="image"
        data-state={state}
        className={boxClass}
        style={boxStyle}
      >
        {content}
      </span>
    );

  return (
    <>
      <button
        ref={(node) => {
          boxRef.current = node;
        }}
        type="button"
        data-slot="image"
        data-state={state}
        aria-label={text.preview(alt)}
        onClick={show}
        className={cn(
          boxClass,
          "cursor-zoom-in p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        style={boxStyle}
      >
        {content}
      </button>
      {!grouped && (
        <ImagePreview
          images={{ src: previewSrc, alt }}
          open={open}
          onOpenChange={setOpen}
          labels={labels}
          container={config.container}
          glass={glass}
          frosted={frosted}
        />
      )}
    </>
  );
}
