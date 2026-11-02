import type { LayoutLinkProps } from "@workspace/ui/layouts/types";
import { useCallback, useMemo, useState } from "react";

/**
 * In-memory routing for layout previews. In an application, pass your router's
 * location as `currentPath` and wrap its Link as `linkComponent`.
 */
export function useDemoRouter(initialPath: string) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const linkComponent = useMemo(
    () =>
      function DemoLink({ href, onClick, ...props }: LayoutLinkProps) {
        return (
          <a
            href={href}
            onClick={(event) => {
              onClick?.(event);
              if (event.defaultPrevented) return;
              event.preventDefault();
              setCurrentPath(href);
            }}
            {...props}
          />
        );
      },
    [],
  );
  const onNavigate = useCallback((href: string) => setCurrentPath(href), []);
  return { currentPath, linkComponent, onNavigate };
}
