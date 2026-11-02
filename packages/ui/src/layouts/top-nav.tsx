"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@workspace/ui/components/navigation-menu";
import { cn } from "cn";
import { MenuIcon } from "lucide-react";
import type * as React from "react";
import { useLayout } from "./layout-provider";
import type { NavLink } from "./types";

type TopNavProps = {
  links: NavLink[];
  className?: string;
  labels?: { navigation?: string; menu?: string };
};

/** Horizontal links from `lg` up; a menu button below it. */
function TopNav({ links, className, labels }: TopNavProps) {
  const { Link, isActive } = useLayout();
  const navigation = labels?.navigation ?? "Main";
  const element = (link: NavLink, active: boolean): React.ReactElement => (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      aria-disabled={link.disabled || undefined}
    />
  );
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className={cn("lg:hidden", className)}
            />
          }
        >
          <MenuIcon />
          <span className="sr-only">{labels?.menu ?? "Open navigation"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <DropdownMenuItem
                key={link.href}
                disabled={link.disabled}
                className={cn(!active && "text-muted-foreground")}
                render={element(link, active)}
              >
                {link.icon && <link.icon />}
                {link.title}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <NavigationMenu
        aria-label={navigation}
        className={cn("hidden flex-none lg:flex", className)}
      >
        <NavigationMenuList className="gap-1">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink
                  active={active}
                  className={cn(
                    "px-3 py-1.5 font-medium",
                    !active && "text-muted-foreground",
                    link.disabled && "pointer-events-none opacity-50",
                  )}
                  render={element(link, active)}
                >
                  {link.icon && <link.icon />}
                  {link.title}
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </>
  );
}

export { TopNav, type TopNavProps };
