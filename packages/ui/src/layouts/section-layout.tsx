"use client";

import { buttonVariants } from "@workspace/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "cn";
import type * as React from "react";
import { useLayout } from "./layout-provider";
import type { NavLink } from "./types";

type SectionNavProps = {
  items: NavLink[];
  label?: string;
  className?: string;
};

/** Vertical from `lg` up, a scrolling row on tablets, a native select on phones. */
function SectionNav({ items, label = "Section", className }: SectionNavProps) {
  const { Link, isActive, navigate } = useLayout();
  const current = items.find((item) => isActive(item.href));
  return (
    <>
      <NativeSelect
        aria-label={label}
        className="w-full md:hidden"
        value={current?.href ?? ""}
        onChange={(event) => navigate(event.target.value)}
      >
        {!current && <NativeSelectOption value="" disabled hidden />}
        {items.map((item) => (
          <NativeSelectOption
            key={item.href}
            value={item.href}
            disabled={item.disabled}
          >
            {item.title}
          </NativeSelectOption>
        ))}
      </NativeSelect>
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
                "shrink-0 justify-start text-muted-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-muted data-active:text-foreground",
              )}
            >
              {item.icon && <item.icon />}
              {item.title}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

type SectionLayoutProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  items: NavLink[];
  navLabel?: string;
};

/** Page with a heading and its own sub-navigation, such as settings. */
function SectionLayout({
  title,
  description,
  items,
  navLabel,
  className,
  children,
  ...props
}: SectionLayoutProps) {
  return (
    <div
      data-slot="section-layout"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl md:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <Separator className="my-4 lg:my-6" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-12">
        <aside className="lg:sticky lg:top-0 lg:w-1/5 lg:shrink-0 lg:self-start">
          <SectionNav items={items} label={navLabel} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export {
  SectionLayout,
  type SectionLayoutProps,
  SectionNav,
  type SectionNavProps,
};
