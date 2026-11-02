"use client";

import * as React from "react";
import type {
  LayoutCollapsible,
  LayoutLinkProps,
  LayoutVariant,
  NavMatcher,
} from "./types";

const DEFAULT_VARIANT: LayoutVariant = "inset";
const DEFAULT_COLLAPSIBLE: LayoutCollapsible = "icon";

function DefaultLink(props: LayoutLinkProps) {
  return <a {...props} />;
}

/** Exact match, ignoring the query and hash. */
export const matchPath: NavMatcher = (href, currentPath) =>
  href === currentPath.split(/[?#]/)[0];

type LayoutContextValue = {
  variant: LayoutVariant;
  collapsible: LayoutCollapsible;
  setVariant: (variant: LayoutVariant) => void;
  setCollapsible: (collapsible: LayoutCollapsible) => void;
  resetLayout: () => void;
  currentPath: string;
  isActive: (href: string) => boolean;
  navigate: (href: string) => void;
  Link: React.ComponentType<LayoutLinkProps>;
};

const LayoutContext = React.createContext<LayoutContextValue | null>(null);

type LayoutProviderProps = {
  children?: React.ReactNode;
  /** Controlled sidebar style. */
  variant?: LayoutVariant;
  defaultVariant?: LayoutVariant;
  onVariantChange?: (variant: LayoutVariant) => void;
  /** Controlled collapse behavior. */
  collapsible?: LayoutCollapsible;
  defaultCollapsible?: LayoutCollapsible;
  onCollapsibleChange?: (collapsible: LayoutCollapsible) => void;
  /** Current location, used to mark active links. */
  currentPath?: string;
  /** Router link, such as a wrapper around TanStack Router or Next.js Link. */
  linkComponent?: React.ComponentType<LayoutLinkProps>;
  /** Client navigation for controls that are not links, such as the mobile select. */
  onNavigate?: (href: string) => void;
  matcher?: NavMatcher;
};

function LayoutProvider({
  children,
  variant: variantProp,
  defaultVariant = DEFAULT_VARIANT,
  onVariantChange,
  collapsible: collapsibleProp,
  defaultCollapsible = DEFAULT_COLLAPSIBLE,
  onCollapsibleChange,
  currentPath = "",
  linkComponent = DefaultLink,
  onNavigate,
  matcher = matchPath,
}: LayoutProviderProps) {
  const [variantState, setVariantState] = React.useState(defaultVariant);
  const [collapsibleState, setCollapsibleState] =
    React.useState(defaultCollapsible);
  const variant = variantProp ?? variantState;
  const collapsible = collapsibleProp ?? collapsibleState;

  const value = React.useMemo<LayoutContextValue>(() => {
    const setVariant = (next: LayoutVariant) => {
      if (variantProp === undefined) setVariantState(next);
      onVariantChange?.(next);
    };
    const setCollapsible = (next: LayoutCollapsible) => {
      if (collapsibleProp === undefined) setCollapsibleState(next);
      onCollapsibleChange?.(next);
    };
    return {
      variant,
      collapsible,
      setVariant,
      setCollapsible,
      resetLayout: () => {
        setVariant(defaultVariant);
        setCollapsible(defaultCollapsible);
      },
      currentPath,
      isActive: (href) => matcher(href, currentPath),
      navigate: onNavigate ?? ((href) => window.location.assign(href)),
      Link: linkComponent,
    };
  }, [
    variant,
    collapsible,
    variantProp,
    collapsibleProp,
    onVariantChange,
    onCollapsibleChange,
    defaultVariant,
    defaultCollapsible,
    currentPath,
    matcher,
    onNavigate,
    linkComponent,
  ]);

  return <LayoutContext value={value}>{children}</LayoutContext>;
}

const fallback: LayoutContextValue = {
  variant: DEFAULT_VARIANT,
  collapsible: DEFAULT_COLLAPSIBLE,
  setVariant: () => {},
  setCollapsible: () => {},
  resetLayout: () => {},
  currentPath: "",
  isActive: () => false,
  navigate: (href) => window.location.assign(href),
  Link: DefaultLink,
};

/** Layout preferences and routing. Outside a provider, links are plain anchors. */
function useLayout() {
  return React.useContext(LayoutContext) ?? fallback;
}

export { LayoutProvider, type LayoutProviderProps, useLayout };
