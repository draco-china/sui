import { createRouter } from "@tanstack/react-router";
import {
  ErrorPage,
  LoadingPage,
  NotFoundPage,
} from "./components/status-pages";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: ErrorPage,
    defaultPendingComponent: LoadingPage,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
