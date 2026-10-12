"use client";

import { type RefObject, useEffect, useState } from "react";

function useViewerTheme(ref?: RefObject<HTMLElement | null>) {
  const [resolvedTheme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const resolve = () =>
      setTheme(
        (ref?.current ?? document.documentElement).closest(".dark")
          ? "dark"
          : "light",
      );
    const observer = new MutationObserver(resolve);
    for (
      let node: HTMLElement | null = ref?.current ?? document.documentElement;
      node;
      node = node.parentElement
    )
      observer.observe(node, { attributes: true, attributeFilter: ["class"] });
    resolve();
    return () => observer.disconnect();
  }, [ref]);
  return { resolvedTheme };
}

export { useViewerTheme };
