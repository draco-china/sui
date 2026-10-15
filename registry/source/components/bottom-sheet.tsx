"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "cn";
import * as React from "react";
import { useBottomSheetController } from "@/hooks/use-bottom-sheet-controller";
import type {
  BottomSheetDetents,
  BottomSheetLayout,
  BottomSheetSize,
} from "@/lib/bottom-sheet";
import { mergeClassNames } from "@/lib/class-name";
import { withGlass } from "@/lib/glass/context";

type BottomSheetShape = Pick<BottomSheetLayout, "expandable" | "full">;

type BottomSheetContextProps = BottomSheetShape & {
  open: boolean;
  modal: DrawerPrimitive.Root.Props["modal"];
  size: BottomSheetSize;
  /** At `"lg"` on an expandable sheet, or a single sheet at full height. */
  expanded: boolean;
  setSize: (size: BottomSheetSize) => void;
  toggle: () => void;
  close: () => void;
  isOpen: () => boolean;
  setShape: (shape: BottomSheetShape) => void;
  detents: BottomSheetDetents;
  keyboard: "resize" | "lift";
  footerMode: "adaptive" | "fixed";
  expandOnInputFocus: boolean;
  contentKey: React.Key | undefined;
  labels: { expand: string; collapse: string };
};

const BottomSheetContext = React.createContext<BottomSheetContextProps | null>(
  null,
);

function useBottomSheet() {
  const context = React.useContext(BottomSheetContext);
  if (!context) {
    throw new Error("useBottomSheet must be used within a BottomSheet.");
  }
  return context;
}

type BottomSheetProps = Omit<
  DrawerPrimitive.Root.Props,
  | "snapPoints"
  | "snapPoint"
  | "defaultSnapPoint"
  | "onSnapPointChange"
  | "snapToSequentialPoints"
  | "swipeDirection"
> & {
  /** `"auto"` offers `"lg"` only once content outgrows the default size. */
  detents?: BottomSheetDetents;
  size?: BottomSheetSize;
  defaultSize?: BottomSheetSize;
  onSizeChange?: (size: BottomSheetSize) => void;
  /** Expands an expandable sheet when a text field inside it takes focus. */
  expandOnInputFocus?: boolean;
  /** `"resize"` fits the keyboard's space; `"lift"` keeps height and rises. */
  keyboard?: "resize" | "lift";
  /** `"adaptive"` scrolls the footer with the body once both no longer fit. */
  footerMode?: "adaptive" | "fixed";
  /** A new key returns the sheet to its default size, scrolled to the top. */
  contentKey?: React.Key;
  labels?: { expand?: string; collapse?: string };
};

function BottomSheetImplementation({
  open: openProp,
  defaultOpen = false,
  modal = true,
  onOpenChange,
  onOpenChangeComplete,
  actionsRef,
  detents = "auto",
  size: sizeProp,
  defaultSize = "default",
  onSizeChange,
  expandOnInputFocus = true,
  keyboard = "resize",
  footerMode = "adaptive",
  contentKey,
  labels,
  ...props
}: BottomSheetProps) {
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const openRef = React.useRef(open);
  openRef.current = open;
  const [_size, _setSize] = React.useState(defaultSize);
  const size = sizeProp ?? _size;
  const [shape, setShapeState] = React.useState<BottomSheetShape>({
    expandable: false,
    full: false,
  });
  const actions = React.useRef<DrawerPrimitive.Root.Actions | null>(null);
  React.useImperativeHandle(
    actionsRef,
    () => ({
      close: () => actions.current?.close(),
      unmount: () => actions.current?.unmount(),
    }),
    [],
  );

  const setSize = React.useCallback(
    (value: BottomSheetSize) => {
      if (sizeProp === undefined) _setSize(value);
      onSizeChange?.(value);
    },
    [sizeProp, onSizeChange],
  );
  const setShape = React.useCallback((value: BottomSheetShape) => {
    setShapeState((current) =>
      current.expandable === value.expandable && current.full === value.full
        ? current
        : value,
    );
  }, []);

  const contextValue = React.useMemo<BottomSheetContextProps>(
    () => ({
      ...shape,
      open,
      modal,
      size,
      expanded: shape.full || (shape.expandable && size === "lg"),
      setSize,
      toggle: () => setSize(size === "lg" ? "default" : "lg"),
      close: () => actions.current?.close(),
      isOpen: () => openRef.current,
      setShape,
      detents,
      keyboard,
      footerMode,
      expandOnInputFocus,
      contentKey,
      labels: {
        expand: labels?.expand ?? "Expand sheet",
        collapse: labels?.collapse ?? "Collapse sheet",
      },
    }),
    [
      shape,
      open,
      modal,
      size,
      setSize,
      setShape,
      detents,
      keyboard,
      footerMode,
      expandOnInputFocus,
      contentKey,
      labels?.expand,
      labels?.collapse,
    ],
  );

  return (
    <BottomSheetContext.Provider value={contextValue}>
      <DrawerPrimitive.Root
        data-slot="bottom-sheet"
        swipeDirection="down"
        modal={modal}
        open={open}
        onOpenChange={(value, details) => {
          onOpenChange?.(value, details);
          if (openProp === undefined && !details.isCanceled) _setOpen(value);
        }}
        onOpenChangeComplete={(value) => {
          // The next opening starts from the default size again.
          if (!value) setSize(defaultSize);
          onOpenChangeComplete?.(value);
        }}
        actionsRef={actions}
        {...props}
      />
    </BottomSheetContext.Provider>
  );
}

function BottomSheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return (
    <DrawerPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />
  );
}

function BottomSheetPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="bottom-sheet-portal" {...props} />;
}

function BottomSheetClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="bottom-sheet-close" {...props} />;
}

function BottomSheetOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="bottom-sheet-overlay"
      className={mergeClassNames(
        "fixed inset-0 z-50 min-h-dvh select-none bg-black/30 opacity-[calc((0.6+0.4*var(--bottom-sheet-progress,0))*(1-var(--bottom-sheet-dismiss,0)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-dragging:duration-0 data-ending-style:duration-300 supports-[-webkit-touch-callout:none]:absolute supports-backdrop-filter:backdrop-blur-xs motion-reduce:duration-0",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetContentImplementation({
  className,
  children,
  showGrabber = true,
  ...props
}: DrawerPrimitive.Popup.Props & { showGrabber?: boolean }) {
  const sheet = useBottomSheet();
  const { popupRef, containerRef, overlayRef, probeRef } =
    useBottomSheetController(sheet);
  // Keep the last content while the sheet animates out, so clearing data in
  // the parent cannot flash an empty sheet.
  const lastChildren = React.useRef(children);
  if (sheet.open) lastChildren.current = children;

  return (
    <BottomSheetPortal>
      {/* A nonmodal sheet leaves the page behind it usable. */}
      {sheet.modal === true && <BottomSheetOverlay ref={overlayRef} />}
      {/* Base UI keeps modality, focus and dismissal; the sheet runs its own
          size gestures, so Base UI's swipe handling stays out. */}
      <DrawerPrimitive.Viewport
        data-slot="bottom-sheet-viewport"
        data-base-ui-swipe-ignore=""
        className="pointer-events-none fixed inset-0 z-50 [--bottom-sheet-top-gap:calc(env(safe-area-inset-top,0px)+0.75rem)]"
      >
        <div
          ref={probeRef}
          aria-hidden="true"
          data-slot="bottom-sheet-probe"
          className="pointer-events-none invisible absolute top-0 h-(--bottom-sheet-top-gap) w-0"
        />
        <DrawerPrimitive.Popup
          ref={popupRef}
          data-slot="bottom-sheet-popup"
          data-size={sheet.size}
          data-expanded={sheet.expanded ? "" : undefined}
          data-expandable={sheet.expandable ? "" : undefined}
          className={mergeClassNames(
            cn(
              "pointer-events-auto absolute mx-auto flex max-w-(--bottom-sheet-max-width) flex-col overflow-hidden rounded-(--bottom-sheet-radius) bg-popover text-popover-foreground text-sm shadow-xl outline-none will-change-transform",
              // Compact floats with a margin on each side and below; it fades
              // out while expanding, so the expanded sheet meets the edges.
              "[--bottom-sheet-gap:--spacing(2)] [--bottom-sheet-margin:calc(var(--bottom-sheet-gap)*(1-var(--bottom-sheet-progress)))] [--bottom-sheet-max-width:none] [--bottom-sheet-radius:2rem] [--bottom-sheet-safe-bottom:max(0px,env(safe-area-inset-bottom,0px)-var(--bottom-sheet-margin))]",
              "right-[calc(var(--bottom-sheet-margin)+env(safe-area-inset-right,0px))] bottom-[calc(var(--bottom-sheet-keyboard,0px)+var(--bottom-sheet-margin))] left-[calc(var(--bottom-sheet-margin)+env(safe-area-inset-left,0px))] h-(--bottom-sheet-height,auto)",
              "transform-[translate3d(0,var(--bottom-sheet-offset,0px),0)] transition-[height,--bottom-sheet-progress,transform,bottom] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-dragging:duration-0 motion-reduce:duration-0",
              "data-ending-style:transform-[translate3d(0,calc(100%+var(--bottom-sheet-margin)+2px),0)] data-starting-style:transform-[translate3d(0,calc(100%+var(--bottom-sheet-margin)+2px),0)] data-ending-style:duration-300",
              // Glass turns opaque while expanding, so a full sheet reads as
              // a solid page.
              "data-[glass=true]:before:pointer-events-none data-[glass=true]:before:absolute data-[glass=true]:before:inset-0 data-[glass=true]:before:-z-1 data-[glass=true]:before:rounded-[inherit] data-[glass=true]:before:bg-popover data-[glass=true]:before:opacity-(--bottom-sheet-progress)",
            ),
            className,
          )}
          {...props}
        >
          {showGrabber && <BottomSheetGrabber />}
          {/* The body scrolls between the header and footer; when space runs
              short, the whole container scrolls instead. */}
          <div
            ref={containerRef}
            data-slot="bottom-sheet-container"
            className="group/bottom-sheet-container data-[scroll=container]:scroll-fade-y flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain not-has-[>[data-slot=bottom-sheet-header]]:pt-5 not-has-[>[data-slot=bottom-sheet-footer]]:pb-(--bottom-sheet-safe-bottom) [overflow-anchor:none] data-[scroll=container]:overflow-y-auto"
          >
            {sheet.open ? children : lastChildren.current}
          </div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </BottomSheetPortal>
  );
}

function BottomSheetGrabber({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { size, expandable, toggle, labels } = useBottomSheet();
  return (
    <button
      type="button"
      data-slot="bottom-sheet-grabber"
      aria-label={size === "lg" ? labels.collapse : labels.expand}
      aria-hidden={expandable ? undefined : true}
      disabled={!expandable}
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-5 cursor-grab touch-none items-start justify-center rounded-t-[inherit] pt-1.5 outline-none after:h-1.25 after:w-9 after:rounded-full after:bg-foreground/20 after:transition-colors hover:after:bg-foreground/30 focus-visible:after:bg-ring active:cursor-grabbing",
        className,
      )}
      onClick={toggle}
      {...props}
    />
  );
}

function BottomSheetHeader({
  className,
  collapseOnScroll = false,
  ...props
}: React.ComponentProps<"div"> & { collapseOnScroll?: boolean }) {
  return (
    <div
      data-slot="bottom-sheet-header"
      data-collapse-on-scroll={collapseOnScroll}
      className={cn(
        "group/bottom-sheet-header relative flex shrink-0 touch-none select-none flex-col gap-1 px-5 pt-6 pb-3",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetTitle({
  className,
  ...props
}: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="bottom-sheet-title"
      className={mergeClassNames(
        "font-heading font-semibold text-base text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="bottom-sheet-description"
      className={mergeClassNames(
        "max-h-24 overflow-hidden text-muted-foreground text-sm transition-[max-height,opacity] duration-200 group-data-collapsed/bottom-sheet-header:max-h-0 group-data-collapsed/bottom-sheet-header:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-body"
      className={cn(
        // Content fades under the header and footer while more remains.
        "scroll-fade-y flex min-h-0 shrink flex-col gap-4 overflow-hidden overscroll-contain px-5 pb-4 group-data-[scroll=container]/bottom-sheet-container:shrink-0 group-data-[scroll=body]/bottom-sheet-container:overflow-y-auto group-data-[scroll=container]/bottom-sheet-container:[mask-image:none]",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn(
        "mt-auto flex shrink-0 flex-col gap-2 px-5 pt-3 pb-[calc(--spacing(4)+var(--bottom-sheet-safe-bottom))]",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetExpandedContent({ ...props }: React.ComponentProps<"div">) {
  const { expanded } = useBottomSheet();
  return (
    <div
      data-slot="bottom-sheet-expanded-content"
      hidden={!expanded}
      {...props}
    />
  );
}

const BottomSheet = withGlass(BottomSheetImplementation, "scope");
const BottomSheetContent = withGlass(
  BottomSheetContentImplementation,
  "portal",
);

export type { BottomSheetDetents, BottomSheetSize } from "@/lib/bottom-sheet";
export {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetExpandedContent,
  BottomSheetFooter,
  BottomSheetGrabber,
  BottomSheetHeader,
  BottomSheetOverlay,
  BottomSheetPortal,
  type BottomSheetProps,
  BottomSheetTitle,
  BottomSheetTrigger,
  useBottomSheet,
};
