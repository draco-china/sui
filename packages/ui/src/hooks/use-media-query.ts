import { useLayoutEffect, useState } from "react";

/**
 * Whether a media query matches. `undefined` on the server and until the first
 * layout effect, so a component can render something that suits every size
 * until it knows.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>();
  useLayoutEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
