"use client";

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import { useContext } from "react";
import { mergeClassNames } from "../lib/class-name";
import { GlassContext, withGlass } from "../lib/glass/context";

const NavigationMenuPopup = withGlass(NavigationMenuPrimitive.Popup, "portal");

function NavigationMenuImplementation({
  align = "start",
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Root.Props &
  Pick<NavigationMenuPrimitive.Positioner.Props, "align">) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={mergeClassNames(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuPositioner align={align} />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={mergeClassNames(
        "group flex flex-1 list-none items-center justify-center gap-0",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={mergeClassNames("relative", className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center rounded-3xl px-4.5 py-2.5 font-medium text-sm outline-none transition-all hover:bg-muted focus:bg-muted focus-visible:outline-1 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 data-open:bg-accent data-popup-open:bg-accent data-open:text-accent-foreground data-popup-open:text-accent-foreground data-open:focus:bg-accent data-popup-open:focus:bg-accent data-open:hover:bg-accent data-popup-open:hover:bg-accent",
);

function NavigationMenuTriggerImplementation({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={mergeClassNames(
        cn(navigationMenuTriggerStyle(), "group"),
        className,
      )}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-px ms-1 size-3 transition duration-300 group-data-open/navigation-menu-trigger:rotate-180 group-data-popup-open/navigation-menu-trigger:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContentImplementation({
  className,
  ...props
}: NavigationMenuPrimitive.Content.Props) {
  const glass = useContext(GlassContext);
  return (
    <GlassContext.Provider value={{ ...glass, enabled: false }}>
      <NavigationMenuPrimitive.Content
        data-slot="navigation-menu-content"
        className={mergeClassNames(
          "data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-95 h-full w-auto p-2.5 pe-3 transition-[opacity,transform,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:data-activation-direction=left:translate-x-[50%] data-ending-style:data-activation-direction=right:translate-x-[-50%] data-starting-style:data-activation-direction=left:translate-x-[-50%] data-starting-style:data-activation-direction=right:translate-x-[50%] data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-ending-style:opacity-0 data-starting-style:opacity-0 **:data-[slot=navigation-menu-link]:focus:outline-none **:data-[slot=navigation-menu-link]:focus:ring-0 group-data-[viewport=false]/navigation-menu:rounded-3xl group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-lg group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:ring-foreground/5 group-data-[viewport=false]/navigation-menu:duration-300 group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-open:animate-in rtl:data-ending-style:data-activation-direction=left:-translate-x-[50%] rtl:data-ending-style:data-activation-direction=right:-translate-x-[-50%] rtl:data-starting-style:data-activation-direction=left:-translate-x-[-50%] rtl:data-starting-style:data-activation-direction=right:-translate-x-[50%] group-data-[viewport=false]/navigation-menu:dark:ring-foreground/10",
          className,
        )}
        {...props}
      />
    </GlassContext.Provider>
  );
}

function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={mergeClassNames(
          "isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] data-instant:transition-none data-[side=bottom]:before:start-0 data-[side=bottom]:before:end-0 data-[side=bottom]:before:top-[-10px]",
          className,
        )}
        {...props}
      >
        <NavigationMenuPopup
          data-slot="navigation-menu-popup"
          className="data-[ending-style]:easing-[ease] relative h-(--popup-height) w-(--popup-width) xs:w-(--popup-width) origin-(--transform-origin) rounded-3xl bg-popover text-popover-foreground shadow-lg outline-none ring-1 ring-foreground/5 transition-[opacity,transform,width,height,scale,translate] duration-[0.35s] ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-150 dark:ring-foreground/10"
        >
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPopup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

function NavigationMenuLinkImplementation({
  className,
  ...props
}: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={mergeClassNames(
        "flex items-center gap-1.5 in-data-[slot=navigation-menu-content]:rounded-2xl rounded-3xl p-3 text-sm outline-none transition-all hover:bg-muted focus:bg-muted focus-visible:outline-1 focus-visible:ring-3 focus-visible:ring-ring/30 data-active:bg-accent data-active:text-accent-foreground data-active:focus:bg-accent data-active:hover:bg-accent [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-indicator"
      className={mergeClassNames(
        "data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=visible]:animate-in",
        className,
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-ss-sm bg-border shadow-md" />
    </NavigationMenuPrimitive.Icon>
  );
}

const NavigationMenu = withGlass(NavigationMenuImplementation, "scope");
const NavigationMenuContent = withGlass(
  NavigationMenuContentImplementation,
  "scope",
);
const NavigationMenuTrigger = withGlass(
  NavigationMenuTriggerImplementation,
  "control",
);
const NavigationMenuLink = withGlass(
  NavigationMenuLinkImplementation,
  "control",
);

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
};
