"use client";

import { type ComponentType, lazy, type ReactNode, Suspense } from "react";

/**
 * Heavy modules are requested only on render. Labels and fallback UI belong
 * to the app. A failed load is not kept: React's `lazy` would rethrow it on
 * every render, so the next render (an error page's retry) loads again.
 */
export function lazyComponent<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
) {
  const create = (): ComponentType<P> =>
    lazy(() =>
      load().catch((error: unknown) => {
        Component = create();
        throw error;
      }),
    );
  let Component = create();
  return function LazyComponent(props: P & { fallback?: ReactNode }) {
    const { fallback = null, ...rest } = props;
    return (
      <Suspense fallback={fallback}>
        <Component {...(rest as P)} />
      </Suspense>
    );
  };
}
