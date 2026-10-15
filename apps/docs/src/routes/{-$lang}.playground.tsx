import { createFileRoute } from "@tanstack/react-router";
import { GlassPlayground } from "../components/glass-playground";
import { getLocale } from "../lib/i18n";

export const Route = createFileRoute("/{-$lang}/playground")({
  head: ({ params }) => ({
    meta: [
      {
        title:
          getLocale(params.lang) === "zh-CN"
            ? "组件体验 — SUI"
            : "Playground — SUI",
      },
    ],
  }),
  component: Playground,
});

function Playground() {
  return <GlassPlayground locale={getLocale(Route.useParams().lang)} />;
}
