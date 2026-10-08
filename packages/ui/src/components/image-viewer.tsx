"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCcwSquare,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  type ComponentProps,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { withGlass } from "../lib/glass/context";
import { ViewerButton } from "../lib/viewer/controls";
import {
  clampImageScale,
  defaultImageTransform,
  normalizeImageIndex,
  wrapImageIndex,
} from "../lib/viewer/image-transform";
import { Button } from "./button";
import { Dialog, DialogOverlay, DialogTitle } from "./dialog";

export type ImageViewerLabels = {
  defaultAlt: string;
  viewer: string;
  zoomOut: string;
  zoomIn: string;
  rotateCounterclockwise: string;
  rotateClockwise: string;
  reset: string;
  close: string;
  previous: string;
  next: string;
  loading: string;
  error: string;
  retry: string;
  imageAlt: (alt: string, index: number) => string;
  open: (alt: string, index: number) => string;
  thumbnail: (alt: string, index: number) => string;
  position: (index: number, total: number) => string;
};
export interface ImageViewerProps {
  images: string | string[];
  open: boolean;
  onClose: () => void;
  index?: number;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  alt?: string;
  container?: ComponentProps<typeof DialogPrimitive.Portal>["container"];
  className?: string;
  glass?: boolean;
  labels?: Partial<ImageViewerLabels>;
}
const defaultLabels: ImageViewerLabels = {
  defaultAlt: "Image",
  viewer: "Image viewer",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  rotateCounterclockwise: "Rotate counterclockwise",
  rotateClockwise: "Rotate clockwise",
  reset: "Reset image",
  close: "Close image viewer",
  previous: "Previous image",
  next: "Next image",
  loading: "Loading image…",
  error: "Unable to load image",
  retry: "Retry",
  imageAlt: (alt, index) => `${alt} ${index}`,
  open: (alt, index) => `Open ${alt} ${index}`,
  thumbnail: (alt, index) => `${alt} thumbnail ${index}`,
  position: (index, total) => `Image ${index} of ${total}`,
};
function ImageViewerImplementation({
  images,
  open,
  onClose,
  index: controlledIndex,
  initialIndex = 0,
  onIndexChange,
  alt,
  container,
  className,
  glass: _glass,
  labels,
}: ImageViewerProps) {
  const text = { ...defaultLabels, ...labels };
  const list = Array.isArray(images) ? images : [images];
  const [localIndex, setIndex] = useState(initialIndex);
  const index = normalizeImageIndex(controlledIndex ?? localIndex, list.length);
  const [transform, setTransform] = useState(defaultImageTransform);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useReducedMotion();
  const close = onClose;
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    distance: number;
    scale: number;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${index}\u0000${list[index]}\u0000${retry}`;
  const [load, setLoad] = useState<{
    key: string;
    state: "ready" | "error";
  } | null>(null);
  const state = load?.key === key ? load.state : "loading";
  const reset = useCallback(() => {
    setTransform(defaultImageTransform);
    pointers.current.clear();
    gesture.current = null;
    setDragging(false);
  }, []);
  const select = useCallback(
    (next: number) => {
      if (!list.length) return;
      const value = wrapImageIndex(next, list.length);
      if (controlledIndex === undefined) setIndex(value);
      onIndexChange?.(value);
      reset();
    },
    [controlledIndex, list.length, onIndexChange, reset],
  );
  function zoomBy(delta: number) {
    setTransform((previous) => ({
      ...previous,
      scale: clampImageScale(previous.scale + delta),
    }));
  }
  function rotateBy(delta: number) {
    setTransform((previous) => ({
      ...previous,
      rotate: previous.rotate + delta,
    }));
  }
  useEffect(() => {
    if (open && controlledIndex === undefined) setIndex(initialIndex);
    reset();
  }, [open, controlledIndex, initialIndex, reset]);
  useEffect(() => {
    void key;
    reset();
  }, [key, reset]);
  useEffect(() => {
    if (!open) return;
    const image = imageRef.current;
    if (image?.complete)
      setLoad({ key, state: image.naturalWidth > 0 ? "ready" : "error" });
  }, [open, key]);
  function beginGesture() {
    const values = [...pointers.current.values()];
    if (!values.length) {
      gesture.current = null;
      setDragging(false);
      return;
    }
    const a = values[0];
    const b = values[1];
    gesture.current = {
      x: b ? (a.x + b.x) / 2 : a.x,
      y: b ? (a.y + b.y) / 2 : a.y,
      tx: transform.x,
      ty: transform.y,
      distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      scale: transform.scale,
    };
    setDragging(true);
  }
  const wheelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setTransform((previous) => ({
        ...previous,
        scale: clampImageScale(
          previous.scale + (event.deltaY > 0 ? -0.25 : 0.25),
        ),
      }));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      state !== "ready" ||
      (event.target instanceof Element && event.target.closest("button"))
    )
      return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    beginGesture();
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const [a, b] = [...pointers.current.values()];
    const start = gesture.current;
    setTransform((previous) => ({
      ...previous,
      x: start.tx + (b ? (a.x + b.x) / 2 : a.x) - start.x,
      y: start.ty + (b ? (a.y + b.y) / 2 : a.y) - start.y,
      scale:
        b && start.distance > 0
          ? clampImageScale(
              (start.scale * Math.hypot(a.x - b.x, a.y - b.y)) / start.distance,
            )
          : previous.scale,
    }));
  }
  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    beginGesture();
  }
  if (!list.length) return null;
  const resolvedAlt = alt ?? text.defaultAlt;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogPrimitive.Portal container={container}>
        <DialogOverlay />
        <ImagePopup
          data-slot="image-viewer"
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-background text-foreground text-sm outline-none",
            className,
          )}
          onKeyDown={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest(
                "input,textarea,select,[contenteditable=true]",
              )
            )
              return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              select(index - 1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              select(index + 1);
            } else if (event.key === "+" || event.key === "=") {
              event.preventDefault();
              zoomBy(0.25);
            } else if (event.key === "-") {
              event.preventDefault();
              zoomBy(-0.25);
            } else if (event.key === "0") {
              event.preventDefault();
              reset();
            }
          }}
        >
          <DialogTitle className="sr-only">{text.viewer}</DialogTitle>
          <div className="flex shrink-0 flex-wrap items-center gap-1 px-3 py-2">
            <ViewerButton
              size="icon-sm"
              variant="ghost"
              tooltip={text.zoomOut}
              onClick={() => zoomBy(-0.25)}
            >
              <ZoomOut aria-hidden="true" />
            </ViewerButton>
            <span className="min-w-12 text-center tabular-nums">
              {Math.round(transform.scale * 100)}%
            </span>
            <ViewerButton
              size="icon-sm"
              variant="ghost"
              tooltip={text.zoomIn}
              onClick={() => zoomBy(0.25)}
            >
              <ZoomIn aria-hidden="true" />
            </ViewerButton>
            <ViewerButton
              size="icon-sm"
              variant="ghost"
              tooltip={text.rotateCounterclockwise}
              onClick={() => rotateBy(-90)}
            >
              <RotateCcw aria-hidden="true" />
            </ViewerButton>
            <ViewerButton
              size="icon-sm"
              variant="ghost"
              tooltip={text.rotateClockwise}
              onClick={() => rotateBy(90)}
            >
              <RotateCw aria-hidden="true" />
            </ViewerButton>
            <ViewerButton
              size="icon-sm"
              variant="ghost"
              tooltip={text.reset}
              disabled={
                transform.scale === 1 &&
                transform.rotate === 0 &&
                transform.x === 0 &&
                transform.y === 0
              }
              onClick={reset}
            >
              <RotateCcwSquare aria-hidden="true" />
            </ViewerButton>
            <span className="ms-auto text-muted-foreground tabular-nums">
              {index + 1} / {list.length}
            </span>
            <ViewerButton
              size="icon-sm"
              variant="ghost"
              tooltip={text.close}
              onClick={close}
            >
              <X aria-hidden="true" />
            </ViewerButton>
          </div>
          <span role="status" className="sr-only">
            {text.position(index + 1, list.length)}
          </span>
          <div
            ref={wheelRef}
            role="none"
            className={cn(
              "relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
          >
            {state === "loading" && <span role="status">{text.loading}</span>}
            {state === "error" && (
              <div className="flex flex-col items-center gap-3">
                <span role="alert" className="text-destructive">
                  {text.error}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoad(null);
                    setRetry((previous) => previous + 1);
                  }}
                >
                  {text.retry}
                </Button>
              </div>
            )}
            <img
              ref={imageRef}
              key={key}
              src={list[index]}
              alt={text.imageAlt(resolvedAlt, index + 1)}
              draggable={false}
              onLoad={() => setLoad({ key, state: "ready" })}
              onError={() => setLoad({ key, state: "error" })}
              className={cn(
                "max-h-full max-w-full select-none object-contain",
                state !== "ready" && "absolute opacity-0",
              )}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotate}deg)`,
                transition:
                  dragging || reducedMotion ? "none" : "transform 150ms ease",
              }}
            />
            {list.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute start-3 z-10 bg-background/80"
                  onClick={() => select(index - 1)}
                  aria-label={text.previous}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-3 z-10 bg-background/80"
                  onClick={() => select(index + 1)}
                  aria-label={text.next}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
          {list.length > 1 && (
            <div
              data-slot="image-viewer-thumbnails"
              className="shrink-0 overflow-x-auto px-3 py-2"
            >
              <div className="mx-auto flex w-max gap-2">
                {list.map((src, imageIndex) => (
                  <Button
                    // biome-ignore lint/suspicious/noArrayIndexKey: Repeated URLs are distinct numbered gallery entries.
                    key={`${src}-${imageIndex}`}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-12 shrink-0 overflow-hidden rounded-lg p-0 ring-2 ring-transparent",
                      imageIndex === index
                        ? "ring-primary"
                        : "opacity-50 hover:opacity-80",
                    )}
                    aria-pressed={imageIndex === index}
                    aria-label={text.open(resolvedAlt, imageIndex + 1)}
                    onClick={() => select(imageIndex)}
                  >
                    <img
                      src={src}
                      alt={text.thumbnail(resolvedAlt, imageIndex + 1)}
                      className="size-full object-cover"
                    />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ImagePopup>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

const ImagePopup = withGlass(DialogPrimitive.Popup, "portal");
const ImageViewer = withGlass(ImageViewerImplementation, "scope");

export { ImageViewer };
