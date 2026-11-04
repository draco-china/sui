"use client";

import { buttonVariants } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query";
import { cn } from "cn";
import type * as React from "react";
import { useId } from "react";
import { useLayout } from "./layout-provider";
import type { NavLink } from "./types";

type SectionNavProps = {
  items: NavLink[];
  label?: string;
  className?: string;
};

/**
 * Links rather than tabs: vertical from `lg` up, a scrolling row on tablets,
 * a select on phones. SectionLayout uses SectionTabs.
 */
function SectionNav({ items, label = "Section", className }: SectionNavProps) {
  const { Link, isActive, navigate } = useLayout();
  const current = items.find((item) => isActive(item.href));
  return (
    <>
      <Select
        items={items.map((item) => ({ value: item.href, label: item.title }))}
        value={current?.href ?? null}
        onValueChange={(value) => value && navigate(value)}
      >
        <SelectTrigger aria-label={label} className="md:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectList>
            {items.map((item) => (
              <SelectItem
                key={item.href}
                value={item.href}
                disabled={item.disabled}
              >
                {item.title}
              </SelectItem>
            ))}
          </SelectList>
        </SelectContent>
      </Select>
      <nav
        aria-label={label}
        className={cn(
          "no-scrollbar hidden gap-1 overflow-x-auto md:flex lg:flex-col lg:overflow-visible",
          className,
        )}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-disabled={item.disabled || undefined}
              data-active={active || undefined}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "min-w-0 shrink-0 justify-start text-muted-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-muted data-active:text-foreground",
              )}
            >
              {item.icon && <item.icon />}
              {/* A long title truncates in the capped side column. */}
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

type SectionTabsProps = SectionNavProps & {
  orientation?: "horizontal" | "vertical";
  /** The id of an element naming the tabs, such as the page heading. */
  labelledBy?: string;
};

/**
 * The sections as line tabs: a row that scrolls when it overflows, or a
 * column with its indicator on the inline end.
 */
function SectionTabs({
  items,
  label = "Section",
  orientation = "horizontal",
  labelledBy,
  className,
}: SectionTabsProps) {
  const { isActive, navigate } = useLayout();
  const current = items.find((item) => isActive(item.href));
  const vertical = orientation === "vertical";
  return (
    <Tabs
      orientation={orientation}
      value={current?.href ?? null}
      onValueChange={(value) => {
        if (typeof value === "string") navigate(value);
      }}
      className={className}
    >
      <TabsList
        variant="line"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        wrapperClassName={vertical ? "w-full" : undefined}
        // A rail on the inline end, as the separator is under the row, so
        // the indicator rides on a line rather than floating in the gap.
        className={cn(
          vertical &&
            "shadow-[inset_-1px_0_0_var(--color-border)] rtl:shadow-[inset_1px_0_0_var(--color-border)]",
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.href}
            value={item.href}
            disabled={item.disabled}
            icon={item.icon && <item.icon />}
          >
            {item.title}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Whether a side column fits: SUI's `lg`. */
const WIDE_QUERY = "(min-width: 1024px)";

type SectionLayoutProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Controls for every section (a date range, a primary action), on the heading's row. */
  actions?: React.ReactNode;
  items: NavLink[];
  /**
   * `"vertical"` (default) lists the sections in a side column from `lg` up,
   * and as a scrolling row of tabs above the content below it.
   * `"horizontal"` shows them as tabs above the content at every size.
   */
  orientation?: "horizontal" | "vertical";
};

/** Page with a heading and its own sub-navigation, such as settings. */
function SectionLayout({
  title,
  description,
  actions,
  items,
  orientation = "vertical",
  className,
  children,
  ...props
}: SectionLayoutProps) {
  // The heading names the tabs, whatever `title` holds.
  const titleId = useId();
  // Unknown on the server and the first paint: render both orientations, CSS
  // showing the right one, then a single set once the width is known.
  const wide = useMediaQuery(WIDE_QUERY);
  const tabs = { items, labelledBy: titleId };
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1">
        <h1 id={titleId} className="font-semibold text-2xl md:text-3xl">
          {title}
        </h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div
          data-slot="section-layout-actions"
          className="flex flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      )}
    </div>
  );
  if (orientation === "horizontal") {
    return (
      <div
        data-slot="section-layout"
        data-orientation="horizontal"
        className={cn("flex min-h-0 flex-1 flex-col", className)}
        {...props}
      >
        {header}
        <SectionTabs {...tabs} className="mt-4 lg:mt-6" />
        <Separator />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-4 lg:pt-6">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div
      data-slot="section-layout"
      data-orientation="vertical"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    >
      {header}
      <Separator className="my-4 lg:my-6" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-12">
        {/* A fifth of the page, held between 192 and 256px, so the column
            neither crowds short titles nor sprawls on wide screens. */}
        <aside className="lg:sticky lg:top-0 lg:w-1/5 lg:min-w-48 lg:max-w-64 lg:shrink-0 lg:self-start">
          {/* One set of tabs: a column beside the content when it fits,
              otherwise a row above it. */}
          {wide === undefined ? (
            <>
              <SectionTabs
                {...tabs}
                orientation="vertical"
                className="hidden lg:flex"
              />
              <SectionTabs {...tabs} className="lg:hidden" />
            </>
          ) : (
            <SectionTabs
              {...tabs}
              orientation={wide ? "vertical" : "horizontal"}
            />
          )}
        </aside>
        {/* A bounded column, so a list in a fixed AppMain scrolls inside and
            keeps its pagination in view, as on a page of its own. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export {
  SectionLayout,
  type SectionLayoutProps,
  SectionNav,
  type SectionNavProps,
  SectionTabs,
  type SectionTabsProps,
};
