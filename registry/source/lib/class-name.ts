import { cn } from "cn";

/** Preserve Base UI state callbacks while merging the component's classes. */
export function mergeClassNames<State>(
  base: string,
  className: string | ((state: State) => string | undefined) | undefined,
) {
  if (typeof className === "function")
    return (state: State) => cn(base, className(state));
  return cn(base, className);
}
