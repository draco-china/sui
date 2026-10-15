"use client";

import { Button } from "@workspace/ui/components/button";
import type { GlassConfig } from "@workspace/ui/components/glass";
import { Move } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ExampleProps } from "../examples/types";

type Position = { x: number; y: number };
type Drag = Position & { pointer: number; originX: number; originY: number };

export function GlassRefractionProbe({
  scene,
  locale,
  glassConfig,
}: ExampleProps & {
  scene: RefObject<HTMLDivElement | null>;
  glassConfig?: GlassConfig;
}) {
  const zh = locale === "zh-CN";
  const lens = useRef<HTMLButtonElement>(null);
  const position = useRef<Position | null>(null);
  const drag = useRef<Drag | null>(null);
  const [coordinates, setCoordinates] = useState<Position | null>(null);
  const [moving, setMoving] = useState(false);
  const description = useId();

  const moveTo = useCallback(
    (next: Position) => {
      const stage = scene.current;
      const surface = lens.current;
      if (!stage || !surface) return;
      const margin = 16;
      const maximumX = Math.max(
        margin,
        stage.clientWidth - surface.offsetWidth - margin,
      );
      const maximumY = Math.max(
        margin,
        stage.clientHeight - surface.offsetHeight - margin,
      );
      const clamped = {
        x: Math.min(maximumX, Math.max(margin, next.x)),
        y: Math.min(maximumY, Math.max(margin, next.y)),
      };
      position.current = clamped;
      setCoordinates((previous) => {
        if (previous?.x === clamped.x && previous.y === clamped.y)
          return previous;
        return clamped;
      });
    },
    [scene],
  );

  useEffect(() => {
    const stage = scene.current;
    const surface = lens.current;
    if (!stage || !surface) return;
    const place = () => {
      moveTo(
        position.current ?? {
          x: stage.clientWidth - surface.offsetWidth - 24,
          y: stage.clientHeight - surface.offsetHeight - 24,
        },
      );
    };
    const observer = new ResizeObserver(place);
    observer.observe(stage);
    place();
    return () => observer.disconnect();
  }, [scene, moveTo]);

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !position.current) return;
    drag.current = {
      ...position.current,
      pointer: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    setMoving(true);
  };
  const continueDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    moveTo({
      x: current.x + event.clientX - current.originX,
      y: current.y + event.clientY - current.originY,
    });
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setMoving(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const directions: Record<string, Position> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const direction = directions[event.key];
    const current = position.current;
    if (!direction || !current) return;
    event.preventDefault();
    const distance = event.shiftKey ? 24 : 8;
    moveTo({
      x: current.x + direction.x * distance,
      y: current.y + direction.y * distance,
    });
  };

  return (
    <Button
      ref={lens}
      variant="outline"
      glass
      glassConfig={glassConfig}
      aria-label={zh ? "折射镜片" : "Refraction lens"}
      aria-describedby={description}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      data-slot="glass-refraction-probe"
      data-glass-motion={moving ? "true" : undefined}
      className="absolute z-20 h-[170px] w-60 max-w-[calc(100%-2rem)] touch-none flex-col justify-between gap-4 whitespace-normal rounded-[2rem] bg-background p-5 text-center shadow-none hover:bg-background active:translate-y-0"
      style={
        coordinates
          ? { left: coordinates.x, top: coordinates.y }
          : { right: 24, bottom: 24 }
      }
      onPointerDown={beginDrag}
      onPointerMove={continueDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={() => {
        drag.current = null;
        setMoving(false);
      }}
      onKeyDown={moveWithKeyboard}
    >
      <span className="flex items-center gap-2 font-medium text-sm">
        <Move aria-hidden="true" />
        {zh ? "折射镜片" : "Refraction lens"}
      </span>
      <span id={description} className="text-xs leading-relaxed opacity-70">
        {zh
          ? "拖动观察折射 · 方向键移动"
          : "Drag to inspect refraction · Arrow keys to move"}
      </span>
    </Button>
  );
}
