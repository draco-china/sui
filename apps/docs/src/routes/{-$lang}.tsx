import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { isLocale } from "../lib/i18n";

export const Route = createFileRoute("/{-$lang}")({
  beforeLoad: ({ params, location }) => {
    if (params.lang && !isLocale(params.lang)) throw notFound();
    if (params.lang === "en-US") {
      const pathname = location.pathname.replace(/^\/en-US(?=\/|$)/, "") || "/";
      throw redirect({
        href: `${pathname}${location.searchStr}${location.hash ? `#${location.hash}` : ""}`,
        statusCode: 308,
      });
    }
  },
  component: Outlet,
});
