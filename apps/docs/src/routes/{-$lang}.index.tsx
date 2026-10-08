import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "../components/home-page";
import { getLocale } from "../lib/i18n";

export const Route = createFileRoute("/{-$lang}/")({
  head: ({ params }) => ({
    meta: [
      {
        title:
          getLocale(params.lang) === "zh-CN"
            ? "SUI — 可组合的 React 组件"
            : "SUI — Composable React components",
      },
      {
        name: "description",
        content:
          getLocale(params.lang) === "zh-CN"
            ? "基于 Base UI 与 Tailwind CSS 的可组合 React 组件。阅读源码、试用示例，构建你的界面"
            : "Composable React components built with Base UI and Tailwind CSS. Read the source, try the examples, and build your interface.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return <HomePage locale={getLocale(Route.useParams().lang)} />;
}
