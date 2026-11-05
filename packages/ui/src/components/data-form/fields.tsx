"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, useLayoutEffect, useRef, useState } from "react";
import {
  useDataFormContext,
  useDataFormFill,
  useDataFormLayout,
} from "./context";
import { DataFormField } from "./field";
import { LightOverflow } from "./light-overflow";
import type { DataFormFieldConfig } from "./types";

const gridColumns = {
  1: "",
  2: "@lg/data-form:grid-cols-2",
  3: "@lg/data-form:grid-cols-2 @3xl/data-form:grid-cols-3",
  4: "@lg/data-form:grid-cols-2 @3xl/data-form:grid-cols-3 @5xl/data-form:grid-cols-4",
};

/**
 * The class a group of fields uses for the current layout: 16px between
 * fields, so each label stays closer to its own control (8px).
 */
export function useFieldsClass() {
  const { layout, columns } = useDataFormLayout();
  if (layout === "light") return "flex flex-wrap items-center gap-2";
  if (layout === "grid")
    return cn("grid grid-cols-1 gap-x-6 gap-y-4", gridColumns[columns]);
  return "flex flex-col gap-4";
}

export interface DataFormFieldsProps extends ComponentProps<"div"> {
  /** Defaults to the form's `fields`. */
  readonly fields?: readonly DataFormFieldConfig[];
}

// One curve for the height, the fields and the chevron, both ways.
const collapseTransition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] } as const;

/** The element's height, measured, so its frame can animate to it. */
function useMeasuredHeight(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);
  return [ref, height] as const;
}

/**
 * Renders `fields` in the form's layout. Past `collapse.count`, a grid
 * keeps the rest mounted but out of view, and a light layout moves them
 * into one Filters popover.
 */
export function DataFormFields({
  fields,
  className,
  children,
  ...props
}: DataFormFieldsProps) {
  const form = useDataFormContext();
  const { layout, collapseCount, collapsed } = useDataFormLayout();
  const reduced = useReducedMotion();
  const light = layout === "light";
  const animated = collapseCount !== undefined && !light;
  const [ref, height] = useMeasuredHeight(animated);
  // Clipped only while the height moves, so focus rings stay whole.
  const [clipping, setClipping] = useState(false);
  const list = (fields ?? form.fields) as readonly DataFormFieldConfig[];
  const fieldsClass = useFieldsClass();
  const fill = useDataFormFill();
  if (list.length === 0 && !children) return null;
  // In a light row, `lightMode: "more"` fields always wait in Filters; the
  // rest fill the row up to `collapse.count`.
  const rowFields = light
    ? list.filter((config) => config.lightMode !== "more")
    : list;
  const limit = collapseCount ?? rowFields.length;
  const visible = light ? rowFields.slice(0, limit) : list;
  const overflow = light
    ? list.filter((config) => !visible.includes(config))
    : [];
  const grid = (
    <div
      ref={ref}
      data-slot="data-form-fields"
      className={cn(
        fieldsClass,
        // In a dialog, the part that scrolls between the header and footer.
        fill && "min-h-0 flex-1 overflow-y-auto px-6 pt-1 pb-6",
        className,
      )}
      {...props}
    >
      {visible.map((config, index) => {
        if (index < limit)
          return <DataFormField key={config.name} {...config} />;
        // Past the count: out of view but mounted while collapsed, so values
        // and validation stay; fading in when the form expands.
        const extra = collapsed
          ? "hidden"
          : "fade-in-0 slide-in-from-top-1 animate-in duration-200 motion-reduce:animate-none";
        return (
          <DataFormField
            key={config.name}
            {...config}
            className={cn(config.className, extra)}
          />
        );
      })}
      {light ? <LightOverflow fields={overflow} /> : null}
      {/* Buttons can sit in the last grid cell, as in a query form. */}
      {children}
    </div>
  );
  if (!animated) return grid;
  return (
    <motion.div
      data-slot="data-form-collapse-frame"
      initial={false}
      animate={{ height: height ?? "auto" }}
      transition={reduced ? { duration: 0 } : collapseTransition}
      className={cn(clipping && "overflow-hidden")}
      onAnimationStart={() => setClipping(true)}
      onAnimationComplete={() => setClipping(false)}
    >
      {grid}
    </motion.div>
  );
}
