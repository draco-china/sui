"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "cn";
import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  Fragment,
  type PointerEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { useDataTableContext } from "@/components/ui/data-table/context";
import type {
  DataTableDensity,
  DataTableInstance,
  NormalizedColumn,
} from "@/components/ui/data-table/types";

/** Beyond this many rows, layout animation costs more than it shows. */
const ANIMATED_ROW_LIMIT = 100;

const densityPadding: Record<DataTableDensity, string> = {
  compact: "py-1.5",
  default: "py-2.5",
  comfortable: "py-4",
};

const alignClass = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

type Offsets = { start: Record<string, number>; end: Record<string, number> };

function pinSide(
  table: DataTableInstance<unknown>,
  column: NormalizedColumn<unknown>,
) {
  if (column.utility) return "start";
  return table.columnState.pinning[column.id];
}

/** Sticky offsets from measured header widths, so pinned columns stack. */
function usePinnedOffsets(
  table: DataTableInstance<unknown>,
  headers: React.RefObject<Map<string, HTMLTableCellElement>>,
) {
  const [offsets, setOffsets] = useState<Offsets>({ start: {}, end: {} });
  const columns = table.visibleColumns;
  useLayoutEffect(() => {
    const next: Offsets = { start: {}, end: {} };
    let start = 0;
    for (const column of columns) {
      if (pinSide(table, column) !== "start") continue;
      next.start[column.id] = start;
      start += headers.current.get(column.id)?.offsetWidth ?? 0;
    }
    let end = 0;
    for (const column of [...columns].reverse()) {
      if (pinSide(table, column) !== "end") continue;
      next.end[column.id] = end;
      end += headers.current.get(column.id)?.offsetWidth ?? 0;
    }
    setOffsets((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next,
    );
  });
  return offsets;
}

/**
 * Marks the scroller while content hides under pinned columns, so their
 * shadows only show when there is something to separate.
 */
function useScrollEdges(scroller: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => {
      const offset = Math.abs(element.scrollLeft);
      const max = element.scrollWidth - element.clientWidth;
      element.toggleAttribute("data-scrolled-start", offset > 0);
      element.toggleAttribute("data-scrolled-end", offset < max - 1);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scroller]);
}

function cellLayout(
  table: DataTableInstance<unknown>,
  column: NormalizedColumn<unknown>,
  offsets: Offsets,
) {
  const side = pinSide(table, column);
  const width = table.columnState.widths[column.id] ?? column.config.width;
  const style: CSSProperties = {};
  if (width !== undefined) {
    style.width = width;
    style.minWidth = width;
    style.maxWidth = width;
  } else if (column.config.minWidth !== undefined) {
    style.minWidth = column.config.minWidth;
  }
  if (side === "start") style.insetInlineStart = offsets.start[column.id] ?? 0;
  if (side === "end") style.insetInlineEnd = offsets.end[column.id] ?? 0;
  const columns = table.visibleColumns;
  const lastStart = [...columns]
    .reverse()
    .find((entry) => pinSide(table, entry) === "start");
  const firstEnd = columns.find((entry) => pinSide(table, entry) === "end");
  return {
    style,
    pinned: !!side,
    className: cn(
      side && "sticky z-10",
      lastStart === column &&
        "after:pointer-events-none after:absolute after:inset-y-0 after:-end-3 after:w-3 after:bg-linear-to-r after:from-foreground/8 after:to-transparent after:opacity-0 after:transition-opacity group-data-[scrolled-start]/scroller:after:opacity-100 dark:after:from-black/50",
      firstEnd === column &&
        "before:pointer-events-none before:absolute before:inset-y-0 before:-start-3 before:w-3 before:bg-linear-to-l before:from-foreground/8 before:to-transparent before:opacity-0 before:transition-opacity group-data-[scrolled-end]/scroller:before:opacity-100 dark:before:from-black/50",
      column.config.align && alignClass[column.config.align],
      column.config.className,
    ),
  };
}

function ResizeHandle({
  table,
  column,
}: {
  table: DataTableInstance<unknown>;
  column: NormalizedColumn<unknown>;
}) {
  function start(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const cell = event.currentTarget.parentElement;
    const startX = event.clientX;
    const startWidth = cell?.offsetWidth ?? 0;
    const direction = document.dir === "rtl" ? -1 : 1;
    const move = (moveEvent: globalThis.PointerEvent) => {
      const width = Math.max(
        48,
        Math.round(startWidth + (moveEvent.clientX - startX) * direction),
      );
      table.setColumnState((current) => ({
        ...current,
        widths: { ...current.widths, [column.id]: width },
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }
  return (
    <div
      aria-hidden
      title={table.labels.resizeColumn}
      onPointerDown={start}
      // Centred on the border with the next column; the last column has
      // none, so its handle stays inside the table rather than widening it
      // by a pixel and showing a horizontal scrollbar.
      className="absolute inset-y-2 -end-px w-1 cursor-col-resize touch-none rounded-full bg-border opacity-0 transition-opacity hover:opacity-100 group-hover/head:opacity-60 [th:last-child>&]:end-0"
    />
  );
}

function StatusRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        {children}
      </td>
    </tr>
  );
}

export function DataTableStatus({
  error,
  onRetry,
  title,
}: {
  error?: boolean;
  onRetry?: () => void;
  title: ReactNode;
}) {
  const table = useDataTableContext();
  return (
    <Empty role="status" className="min-h-48 border-0 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {error ? <CircleAlert /> : <Inbox />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {table.labels.retry}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

function useAnimatedRows(table: DataTableInstance<unknown>) {
  const reduced = useReducedMotion();
  return (
    !reduced &&
    !table.features.virtual &&
    !table.features.dragSort &&
    table.rows.length <= ANIMATED_ROW_LIMIT
  );
}

/** Virtual window over the rows from the scroll container's position. */
function useVirtualWindow(
  table: DataTableInstance<unknown>,
  scroller: React.RefObject<HTMLDivElement | null>,
) {
  const virtual = table.features.virtual;
  const [view, setView] = useState({ top: 0, height: 800 });
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!virtual || !element) return;
    const update = () =>
      setView({ top: element.scrollTop, height: element.clientHeight || 800 });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [virtual, scroller]);
  if (!virtual)
    return { start: 0, end: table.rows.length, before: 0, after: 0 };
  const { rowHeight, overscan } = virtual;
  const start = Math.max(0, Math.floor(view.top / rowHeight) - overscan);
  const end = Math.min(
    table.rows.length,
    Math.ceil((view.top + view.height) / rowHeight) + overscan,
  );
  return {
    start,
    end,
    before: start * rowHeight,
    after: (table.rows.length - end) * rowHeight,
  };
}

function DataRows({
  table,
  offsets,
  scroller,
}: {
  table: DataTableInstance<unknown>;
  offsets: Offsets;
  scroller: React.RefObject<HTMLDivElement | null>;
}) {
  const animated = useAnimatedRows(table);
  const range = useVirtualWindow(table, scroller);
  const columns = table.visibleColumns;
  const padding = densityPadding[table.density];
  const rowRenderer = table.plugins.find((plugin) => plugin.renderRow);
  const afterRenderers = table.plugins.filter(
    (plugin) => plugin.renderAfterRow,
  );
  const rows = table.rows.slice(range.start, range.end).map((row, offset) => {
    const index = range.start + offset;
    const id = table.getRowId(row, index);
    const selected = table.selection?.isSelected(id);
    const cells = columns.map((column) => {
      const layout = cellLayout(table, column, offsets);
      return (
        <td
          key={column.id}
          data-slot="data-table-cell"
          style={layout.style}
          className={cn(
            "whitespace-nowrap px-3 align-middle has-[[role=checkbox]]:pe-0",
            padding,
            layout.className,
            layout.pinned && "bg-inherit",
          )}
        >
          {column.renderCell(row, index)}
        </td>
      );
    });
    const rowProps = {
      "data-state": selected ? "selected" : undefined,
      className:
        "group/row border-b bg-background hover:bg-muted data-[state=selected]:bg-accent",
    } as ComponentProps<"tr">;
    const content = rowRenderer?.renderRow ? (
      rowRenderer.renderRow(
        { row, id, index, rowProps, children: cells },
        table,
      )
    ) : (
      <motion.tr
        key={id}
        {...(rowProps as object)}
        layout={animated ? "position" : false}
        initial={animated ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={
          animated ? { opacity: 0, transition: { duration: 0.12 } } : undefined
        }
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
      >
        {cells}
      </motion.tr>
    );
    const after = afterRenderers.map((plugin) => (
      <AnimatePresence key={`${id}-${plugin.name}`} initial={false}>
        {plugin.renderAfterRow?.(row, id, table)}
      </AnimatePresence>
    ));
    if (after.length === 0 && !rowRenderer) return content;
    return (
      <Fragment key={id}>
        {content}
        {after}
      </Fragment>
    );
  });
  const spacer = (height: number, key: string) =>
    height > 0 && (
      <tr key={key} aria-hidden style={{ height }}>
        <td colSpan={columns.length} />
      </tr>
    );
  const body = (
    <>
      {spacer(range.before, "before")}
      {animated ? (
        <AnimatePresence initial={false} mode="popLayout">
          {rows}
        </AnimatePresence>
      ) : (
        rows
      )}
      {spacer(range.after, "after")}
    </>
  );
  return table.plugins.reduce<ReactNode>(
    (children, plugin) =>
      plugin.wrapBody ? plugin.wrapBody(children, table) : children,
    body,
  );
}

function SkeletonRows({ table }: { table: DataTableInstance<unknown> }) {
  const count = Math.min(table.state.pageSize, 8);
  return Array.from({ length: count }, (_, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity.
    <tr key={index} className="border-b">
      {table.visibleColumns.map((column) => (
        <td
          key={column.id}
          className={cn("px-3", densityPadding[table.density])}
        >
          <Skeleton className="h-4 w-full max-w-40" />
        </td>
      ))}
    </tr>
  ));
}

function TableView({ className }: { className?: string }) {
  const table = useDataTableContext();
  const headers = useRef(new Map<string, HTMLTableCellElement>());
  const scroller = useRef<HTMLDivElement>(null);
  const offsets = usePinnedOffsets(table, headers);
  useScrollEdges(scroller);
  const columns = table.visibleColumns;
  const firstLoad = table.loading && table.rows.length === 0;
  let status: ReactNode = null;
  if (table.error)
    status = (
      <DataTableStatus
        error
        title={table.labels.loadFailed}
        onRetry={table.reload}
      />
    );
  else if (!table.loading && table.rows.length === 0)
    status = <DataTableStatus title={table.labels.noData} />;
  return (
    // Base UI draws the scrollbars, so every platform shows them the same
    // way: only while the pointer is over the table, it scrolls, or it has
    // keyboard focus.
    <ScrollAreaPrimitive.Root
      data-slot="data-table-scroll-area"
      className={cn(
        "group/scroll-area relative flex min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      <ScrollAreaPrimitive.Viewport
        ref={scroller}
        data-slot="data-table-scroller"
        className="group/scroller min-h-0 flex-1 overscroll-x-contain rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <table
          data-slot="data-table"
          aria-busy={table.loading}
          className="w-full caption-bottom border-separate border-spacing-0 text-sm [&_td]:border-b [&_tr:last-child_td]:border-b-0"
        >
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              {columns.map((column) => {
                const layout = cellLayout(table, column, offsets);
                const sorted = table.state.sort.find(
                  (item) => item.key === column.id,
                );
                let ariaSort: "ascending" | "descending" | "none" | undefined;
                if (column.sortable)
                  ariaSort = sorted
                    ? ({ asc: "ascending", desc: "descending" } as const)[
                        sorted.order
                      ]
                    : "none";
                return (
                  <th
                    key={column.id}
                    ref={(node) => {
                      if (node) headers.current.set(column.id, node);
                      else headers.current.delete(column.id);
                    }}
                    aria-sort={ariaSort}
                    style={layout.style}
                    className={cn(
                      // Positioned, so each resize handle sits on its own
                      // column's edge; pinned columns become sticky instead.
                      "group/head relative h-11 whitespace-nowrap border-b bg-background px-3 text-start align-middle font-medium text-muted-foreground has-[[role=checkbox]]:pe-0",
                      layout.className,
                      column.config.align && alignClass[column.config.align],
                    )}
                  >
                    {column.display ? (
                      column.title
                    ) : (
                      <DataTableColumnHeader
                        column={column}
                        className={cn(
                          column.config.align === "end" && "ms-auto",
                        )}
                      />
                    )}
                    {table.features.resizable && !column.utility && (
                      <ResizeHandle table={table} column={column} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            data-slot="data-table-body"
            className={cn(
              "transition-opacity",
              table.loading && !firstLoad && "pointer-events-none opacity-60",
            )}
          >
            {firstLoad && <SkeletonRows table={table} />}
            {!firstLoad && !status && (
              <DataRows table={table} offsets={offsets} scroller={scroller} />
            )}
            {status && <StatusRow colSpan={columns.length}>{status}</StatusRow>}
          </tbody>
        </table>
      </ScrollAreaPrimitive.Viewport>
      {table.loading && !firstLoad && (
        <div
          role="status"
          aria-label={table.labels.loading}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <TableScrollbar orientation="horizontal" />
      <TableScrollbar orientation="vertical" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function TableScrollbar({
  orientation,
}: {
  orientation: "horizontal" | "vertical";
}) {
  return (
    // The vertical track starts below the sticky header (h-11), so the
    // header stays on top and the thumb only runs beside the rows. Base UI
    // sets `top` inline, hence the important modifier. Hidden until the
    // pointer enters the table, it scrolls (touch has no hover), or the
    // scroller has keyboard focus.
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      className="z-30 flex touch-none select-none p-0.5 opacity-0 transition-opacity group-has-[[data-slot=data-table-scroller]:focus-visible]/scroll-area:opacity-70 data-[orientation=vertical]:top-11! data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-hovering:opacity-70 data-scrolling:opacity-70 data-hovering:hover:opacity-100 motion-reduce:transition-none"
    >
      <ScrollAreaPrimitive.Thumb className="flex-1 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/60" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

/** Narrow screens show each row as a card of title and value pairs. */
function CardView({ className }: { className?: string }) {
  const table = useDataTableContext();
  const reduced = useReducedMotion();
  const columns = table.visibleColumns.filter((column) => !column.utility);
  const primary = columns.find((column) => column.config.primary) ?? columns[0];
  const rest = columns.filter((column) => column !== primary);
  let status: ReactNode = null;
  if (table.error)
    status = (
      <DataTableStatus
        error
        title={table.labels.loadFailed}
        onRetry={table.reload}
      />
    );
  else if (!table.loading && table.rows.length === 0)
    status = <DataTableStatus title={table.labels.noData} />;
  return (
    <div
      data-slot="data-table-cards"
      aria-busy={table.loading}
      className={cn("min-h-0 space-y-2 overflow-auto", className)}
    >
      {status}
      {table.loading &&
        table.rows.length === 0 &&
        Array.from({ length: 4 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity.
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      <AnimatePresence initial={false} mode="popLayout">
        {table.rows.map((row, index) => {
          const id = table.getRowId(row, index);
          const selected = table.selection?.isSelected(id) ?? false;
          return (
            <motion.div
              key={id}
              layout={reduced ? false : "position"}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              data-state={selected ? "selected" : undefined}
              className="rounded-xl border bg-card p-3 text-sm data-[state=selected]:bg-accent"
            >
              <div className="mb-2 flex items-center gap-2 font-medium">
                {table.selection && (
                  <Checkbox
                    aria-label={table.labels.selectRow}
                    checked={selected}
                    disabled={table.selection.isDisabled(row)}
                    onCheckedChange={() => table.selection?.toggle(id, row)}
                  />
                )}
                <div className="min-w-0 flex-1 truncate">
                  {primary?.renderCell(row, index)}
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                {rest.map((column) => (
                  <div key={column.id} className="contents">
                    <dt className="text-muted-foreground">{column.title}</dt>
                    <dd className="min-w-0 text-end">
                      {column.renderCell(row, index)}
                    </dd>
                  </div>
                ))}
              </dl>
              {table.plugins.map(
                (plugin) =>
                  plugin.renderAfterRow && (
                    <table key={plugin.name} className="mt-2 w-full">
                      <tbody>
                        <AnimatePresence initial={false}>
                          {plugin.renderAfterRow(row, id, table)}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  ),
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export interface DataTableContentProps {
  readonly className?: string;
  /** Shows cards on narrow screens; defaults to true. */
  readonly responsive?: boolean;
}

/** The rows of the table: header, body, loading, empty and error states. */
export function DataTableContent({
  className,
  responsive = true,
}: DataTableContentProps) {
  const mobile = useIsMobile();
  if (responsive && mobile) return <CardView className={className} />;
  return <TableView className={className} />;
}
