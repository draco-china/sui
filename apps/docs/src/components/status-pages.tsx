import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { getLocale, localePath } from "../lib/i18n";
import { layoutOptions } from "../lib/layout";

export function NotFoundPage() {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  const chinese = locale === "zh-CN";
  return (
    <HomeLayout {...layoutOptions(locale)}>
      <div id="main-content" className="status-page">
        <p className="status-code">404</p>
        <h1>{chinese ? "没有找到这篇文档" : "This page could not be found"}</h1>
        <p>
          {chinese
            ? "检查地址，或回到组件目录继续浏览"
            : "Check the address or explore the component directory."}
        </p>
        <Button render={<Link to={localePath(locale, "/docs/components")} />}>
          {chinese ? "浏览组件" : "Browse components"}
        </Button>
      </div>
    </HomeLayout>
  );
}

export function ErrorPage({ reset }: { reset: () => void }) {
  const { lang } = useParams({ strict: false });
  const chinese = getLocale(lang) === "zh-CN";
  return (
    <HomeLayout {...layoutOptions(getLocale(lang))}>
      <div id="main-content" className="status-page" role="alert">
        <h1>{chinese ? "页面暂时无法加载" : "Something went wrong"}</h1>
        <p>
          {chinese
            ? "请重试，或通过导航访问其他文档"
            : "Try again, or use the navigation to visit another document."}
        </p>
        <Button onClick={reset}>{chinese ? "重试" : "Try again"}</Button>
      </div>
    </HomeLayout>
  );
}

export function LoadingPage() {
  const { lang } = useParams({ strict: false });
  return (
    <div className="status-page" role="status">
      {getLocale(lang) === "zh-CN" ? "正在加载文档…" : "Loading documentation…"}
    </div>
  );
}
