"use client";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import * as React from "react";
import { mergeClassNames } from "../lib/class-name";
import { withGlass } from "../lib/glass/context";

// Keep grouped buttons, page input, and selects on the same opaque surface.
const paginationControlClassName =
  "border-border bg-background text-foreground hover:bg-muted disabled:bg-background disabled:text-muted-foreground disabled:opacity-100 dark:bg-background dark:hover:bg-muted";

interface PaginationRangeInfo {
  page: number;
  perPage: number;
  totalCount?: number;
  pageCount?: number;
  from: number;
  to: number;
}

interface PaginationLabels {
  navigation?: string;
  firstPage?: string;
  previousPage?: string;
  nextPage?: string;
  lastPage?: string;
  pageNumber?: string;
  pageSize?: string;
  range?: (info: PaginationRangeInfo) => React.ReactNode;
}

type PaginationControlsMode = "full" | "simple";
type PaginationProps = React.ComponentProps<"nav"> & {
  page?: number;
  onPageChange?: (page: number) => void;
  perPage?: number;
  totalCount?: number;
  hasNextPage?: boolean;
  controls?: PaginationControlsMode;
  disabled?: boolean;
  labels?: PaginationLabels;
};

type PaginationContextValue = PaginationRangeInfo & {
  disabled: boolean;
  controls: PaginationControlsMode;
  canPrevious: boolean;
  canNext: boolean;
  changePage: (page: number) => void;
  labels: Required<PaginationLabels>;
};

const defaultLabels: Required<PaginationLabels> = {
  navigation: "Pagination",
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  pageNumber: "Page number",
  pageSize: "Page size",
  range: ({ from, to, totalCount, page }) =>
    totalCount === undefined
      ? `Page ${page}`
      : `Showing ${from}–${to} of ${totalCount}`,
};
const PaginationContext = React.createContext<PaginationContextValue | null>(
  null,
);

function usePagination() {
  const context = React.useContext(PaginationContext);
  if (!context)
    throw new Error("Pagination parts require a Pagination parent.");
  return context;
}

function safeInteger(value: number, fallback: number, minimum: number): number {
  return Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), minimum), Number.MAX_SAFE_INTEGER)
    : fallback;
}

function pageRange(
  page: number,
  perPage: number,
  totalCount?: number,
): PaginationRangeInfo {
  const size = safeInteger(perPage, 10, 1);
  const total =
    totalCount === undefined ? undefined : safeInteger(totalCount, 0, 0);
  const pageCount =
    total === undefined ? undefined : Math.max(1, Math.ceil(total / size));
  const current = Math.min(
    safeInteger(page, 1, 1),
    pageCount ?? Number.MAX_SAFE_INTEGER,
  );
  return {
    page: current,
    perPage: size,
    totalCount: total,
    pageCount,
    from:
      total === 0
        ? 0
        : Math.min((current - 1) * size + 1, Number.MAX_SAFE_INTEGER),
    to:
      total === 0
        ? 0
        : Math.min(current * size, total ?? Number.MAX_SAFE_INTEGER),
  };
}

function PaginationImplementation({
  className,
  page: controlledPage,
  onPageChange,
  perPage = 10,
  totalCount,
  hasNextPage,
  controls = "full",
  disabled = false,
  labels: labelsProp,
  children,
  ...props
}: PaginationProps) {
  const [internalPage, setInternalPage] = React.useState(1);
  const requestedPage = controlledPage ?? internalPage;
  const info = pageRange(requestedPage, perPage, totalCount);
  const labels = {
    ...defaultLabels,
    ...Object.fromEntries(
      Object.entries(labelsProp ?? {}).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  };
  const correction = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (requestedPage === info.page) {
      correction.current = null;
      return;
    }
    const key = `${requestedPage}:${info.page}:${info.perPage}:${info.totalCount}`;
    if (correction.current === key) return;
    correction.current = key;
    if (controlledPage === undefined) setInternalPage(info.page);
    onPageChange?.(info.page);
  }, [
    requestedPage,
    info.page,
    info.perPage,
    info.totalCount,
    controlledPage,
    onPageChange,
  ]);

  const empty = info.totalCount === 0;
  const canPrevious = !disabled && !empty && info.page > 1;
  const canNext =
    !disabled &&
    !empty &&
    (info.pageCount === undefined
      ? hasNextPage === true && info.page < Number.MAX_SAFE_INTEGER
      : info.page < info.pageCount);
  const context: PaginationContextValue = {
    ...info,
    disabled,
    controls,
    canPrevious,
    canNext,
    labels,
    changePage: (next) => {
      if (disabled || empty || !Number.isFinite(next)) return;
      const target = pageRange(next, info.perPage, info.totalCount).page;
      if (target === info.page) return;
      if (
        info.pageCount === undefined &&
        ((target !== info.page - 1 && target !== info.page + 1) ||
          (target > info.page && !canNext))
      )
        return;
      if (controlledPage === undefined) setInternalPage(target);
      onPageChange?.(target);
    },
  };
  return (
    <PaginationContext.Provider value={context}>
      <nav
        aria-label={labels.navigation}
        data-slot="pagination"
        className={cn(
          "mx-auto flex w-full flex-wrap items-center justify-between gap-3 text-sm",
          className,
        )}
        {...props}
      >
        {children === undefined ? (
          <>
            <PaginationInfo />
            <PaginationControls />
          </>
        ) : (
          children
        )}
      </nav>
    </PaginationContext.Provider>
  );
}

type PaginationInfoProps = Omit<React.ComponentProps<"div">, "children"> & {
  children?: React.ReactNode | ((info: PaginationRangeInfo) => React.ReactNode);
};

function PaginationInfo({
  className,
  children,
  ...props
}: PaginationInfoProps) {
  const context = usePagination();
  const { page, perPage, totalCount, pageCount, from, to } = context;
  const info = { page, perPage, totalCount, pageCount, from, to };
  return (
    <div
      data-slot="pagination-info"
      aria-live="polite"
      aria-atomic="true"
      className={cn("text-muted-foreground text-sm tabular-nums", className)}
      {...props}
    >
      {typeof children === "function"
        ? children(info)
        : (children ?? context.labels.range(info))}
    </div>
  );
}

type PaginationControlsProps = React.ComponentProps<"div"> & {
  controls?: PaginationControlsMode;
  pageSelector?: "input" | "dropdown";
};

function PaginationControls({
  className,
  controls,
  pageSelector = "input",
  ...props
}: PaginationControlsProps) {
  const context = usePagination();
  const {
    page,
    pageCount,
    disabled,
    labels,
    canPrevious,
    canNext,
    changePage,
  } = context;
  const full =
    (controls ?? context.controls) === "full" && pageCount !== undefined;
  const unavailable = disabled || context.totalCount === 0;
  const [editing, setEditing] = React.useState({
    page,
    pageCount,
    value: String(page),
    dirty: false,
  });
  const currentDraft = editing.page === page && editing.pageCount === pageCount;
  if (!currentDraft) {
    setEditing({ page, pageCount, value: String(page), dirty: false });
  }
  const draft = currentDraft ? editing.value : String(page);
  function reset() {
    setEditing({ page, pageCount, value: String(page), dirty: false });
  }
  function commit(value: string) {
    if (!currentDraft || !editing.dirty) return;
    const number = /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
    const target = Number.isFinite(number)
      ? Math.min(Math.max(number, 1), pageCount ?? page)
      : page;
    setEditing({ page, pageCount, value: String(page), dirty: false });
    changePage(target);
  }
  // Dropdowns are for small page counts; large datasets keep a bounded input.
  const dropdown = pageSelector === "dropdown" && (pageCount ?? 0) <= 200;
  return (
    <div
      data-slot="pagination-controls"
      className={cn("flex shrink-0 items-center", className)}
      {...props}
    >
      <ButtonGroup aria-label={labels.navigation}>
        {full && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-variant="outline"
            className={paginationControlClassName}
            aria-label={labels.firstPage}
            disabled={!canPrevious}
            onClick={() => changePage(1)}
          >
            <ChevronFirstIcon className="rtl:rotate-180" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-variant="outline"
          className={paginationControlClassName}
          aria-label={labels.previousPage}
          disabled={!canPrevious}
          onClick={() => changePage(page - 1)}
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
        </Button>
        {full &&
          (dropdown ? (
            <Select
              value={page}
              disabled={unavailable}
              onValueChange={(next) => {
                if (next !== null) changePage(next);
              }}
            >
              <SelectTrigger
                className={cn(
                  paginationControlClassName,
                  "h-9 min-w-14 justify-center gap-1 px-2",
                )}
                aria-label={labels.pageNumber}
              >
                <SelectValue>{page}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: pageCount ?? 1 },
                  (_, index) => index + 1,
                ).map((number) => (
                  <SelectItem key={number} value={number}>
                    {number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label={labels.pageNumber}
              className={cn(
                paginationControlClassName,
                "h-9 w-14 flex-none px-2 text-center tabular-nums",
              )}
              value={draft}
              disabled={unavailable}
              autoComplete="off"
              onChange={(event) =>
                setEditing({
                  page,
                  pageCount,
                  value: event.target.value,
                  dirty: true,
                })
              }
              onBlur={(event) => commit(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit(event.currentTarget.value);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  reset();
                }
              }}
            />
          ))}
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-variant="outline"
          className={paginationControlClassName}
          aria-label={labels.nextPage}
          disabled={!canNext}
          onClick={() => changePage(page + 1)}
        >
          <ChevronRightIcon className="rtl:rotate-180" />
        </Button>
        {full && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-variant="outline"
            className={paginationControlClassName}
            aria-label={labels.lastPage}
            disabled={!canNext}
            onClick={() => changePage(pageCount ?? page)}
          >
            <ChevronLastIcon className="rtl:rotate-180" />
          </Button>
        )}
      </ButtonGroup>
    </div>
  );
}

type PaginationPageSizeProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  options?: readonly number[];
  label?: React.ReactNode;
  disabled?: boolean;
};

function PaginationPageSize({
  value,
  onValueChange,
  options = [10, 20, 50, 100],
  label = "Rows per page",
  disabled = false,
  className,
  ...props
}: PaginationPageSizeProps) {
  const context = usePagination();
  const id = React.useId();
  const size = safeInteger(value, context.perPage, 1);
  const sizes = [
    ...new Set([
      size,
      ...options.filter((option) => Number.isSafeInteger(option) && option > 0),
    ]),
  ].sort((a, b) => a - b);
  return (
    <div
      data-slot="pagination-page-size"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {label !== null && (
        <Label htmlFor={id} className="font-normal text-muted-foreground">
          {label}
        </Label>
      )}
      <Select
        value={size}
        disabled={disabled || context.disabled}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={context.labels.pageSize}
          className={cn(paginationControlClassName, "min-w-18")}
        >
          <SelectValue>{size}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sizes.map((number) => (
            <SelectItem key={number} value={number}>
              {number}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PaginationSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="pagination-separator"
      orientation={orientation}
      className={mergeClassNames("h-6 data-vertical:self-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("mx-auto flex items-center gap-1", className)}
      {...props}
    />
  );
}
function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = { isActive?: boolean; disabled?: boolean } & Pick<
  VariantProps<typeof buttonVariants>,
  "size"
> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  disabled = false,
  href,
  onClick,
  tabIndex,
  ...props
}: PaginationLinkProps) {
  const context = React.useContext(PaginationContext);
  const unavailable =
    disabled ||
    context?.disabled ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  return (
    <a
      {...props}
      href={unavailable ? undefined : href}
      tabIndex={unavailable ? -1 : tabIndex}
      aria-disabled={unavailable || undefined}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({ variant: isActive ? "default" : "ghost", size }),
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        className,
      )}
      onClick={(event) => {
        if (unavailable) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  const context = React.useContext(PaginationContext);
  return (
    <PaginationLink
      aria-label={context?.labels.previousPage ?? defaultLabels.previousPage}
      size="default"
      className={cn("ps-2!", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" className="rtl:rotate-180" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  );
}
function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  const context = React.useContext(PaginationContext);
  return (
    <PaginationLink
      aria-label={context?.labels.nextPage ?? defaultLabels.nextPage}
      size="default"
      className={cn("pe-2!", className)}
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon data-icon="inline-end" className="rtl:rotate-180" />
    </PaginationLink>
  );
}
function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export type {
  PaginationControlsMode,
  PaginationControlsProps,
  PaginationInfoProps,
  PaginationLabels,
  PaginationLinkProps,
  PaginationPageSizeProps,
  PaginationProps,
  PaginationRangeInfo,
};

const Pagination = withGlass(PaginationImplementation, "scope");

export {
  Pagination,
  PaginationContent,
  PaginationControls,
  PaginationEllipsis,
  PaginationInfo,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPageSize,
  PaginationPrevious,
  PaginationSeparator,
};
