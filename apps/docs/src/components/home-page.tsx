import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "@workspace/ui/components/copy-icon";
import { GlassProvider } from "@workspace/ui/components/glass";
import { useClipboard } from "@workspace/ui/hooks/use-clipboard";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { type Locale, localePath } from "../lib/i18n";
import { LayoutLocaleSwitch } from "../lib/layout";
import { HomeGlassPreview } from "./home-glass-preview";
import { Logo } from "./logo";
import { ThemeModeMenu } from "./theme-mode-menu";
import { ThemePanel } from "./theme-panel";

const snippet = 'import { Button } from "@workspace/ui/components/button";';
export function HomePage({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  const { status, copy } = useClipboard(snippet);
  const copied = status === "copied";
  const copyLabels = zh
    ? {
        copy: "复制代码",
        copied: "代码已复制",
        failed: "无法复制，请手动选择代码",
      }
    : {
        copy: "Copy code",
        copied: "Code copied",
        failed: "Copy unavailable, select the code manually",
      };
  const copyLabel = copied ? copyLabels.copied : copyLabels.copy;
  const feedback = {
    idle: "",
    pending: "",
    copied: copyLabels.copied,
    error: copyLabels.failed,
  }[status];
  return (
    <div className="sui-home" data-locale={locale}>
      <a className="home-skip-link" href="#main-content">
        {zh ? "跳至主要内容" : "Skip to content"}
      </a>
      <header className="home-header">
        <Link
          className="home-brand"
          to={localePath(locale, "/")}
          aria-label={zh ? "SUI 首页" : "SUI home"}
        >
          <Logo />
        </Link>
        <nav
          className="home-nav"
          aria-label={zh ? "主导航" : "Main navigation"}
        >
          <Link to={localePath(locale, "/docs")}>{zh ? "文档" : "Docs"}</Link>
          <Link to={localePath(locale, "/docs/components")}>
            {zh ? "组件" : "Components"}
          </Link>
        </nav>
        <div className="home-header-actions">
          <ThemeModeMenu locale={locale} />
          <ThemePanel locale={locale} />
          <LayoutLocaleSwitch />
        </div>
      </header>
      <main id="main-content" className="home-main">
        <section className="hero-copy" aria-labelledby="home-title">
          <h1 id="home-title">
            {zh ? (
              <>
                <span>从组件出发，</span>
                <span>构建你的</span>
                <span>
                  <em>界面</em>
                </span>
              </>
            ) : (
              <>
                <span>Build interfaces</span>
                <span>Make them</span>
                <span>
                  <em>yours</em>
                </span>
              </>
            )}
          </h1>
          <p>
            {zh
              ? "基于 Base UI 与 Tailwind CSS 的可组合 React 组件。阅读源码、试用示例，让每一处交互贴合你的产品"
              : "Composable React components, built with Base UI and Tailwind CSS. Read the source, try the examples, and shape your own interface"}
          </p>
          <div className="hero-actions">
            <GlassProvider mode="css">
              <Button
                glass
                glassIntensity="lg"
                nativeButton={false}
                size="lg"
                render={<Link to={localePath(locale, "/docs/installation")} />}
              >
                {zh ? "开始使用" : "Get started"}
                <ArrowRight />
              </Button>
            </GlassProvider>
            <Button
              nativeButton={false}
              variant="ghost"
              size="lg"
              render={<Link to={localePath(locale, "/docs/components")} />}
            >
              {zh ? "浏览组件" : "Browse components"}
              <ArrowUpRight />
            </Button>
          </div>
          <div className="home-source">
            <code>
              <span className="home-code-keyword">import</span>
              {" { Button } "}
              <span className="home-code-keyword">from</span>{" "}
              <span className="home-code-string">
                {'"@workspace/ui/components/button"'}
              </span>
            </code>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => void copy()}
              disabled={status === "pending"}
              aria-busy={status === "pending"}
              aria-label={copyLabel}
              title={status === "error" ? copyLabels.failed : copyLabel}
            >
              <CopyIcon status={status} />
            </Button>
          </div>
          <span className="sr-only" role="status">
            {feedback}
          </span>
        </section>
        <section
          className="home-playground"
          aria-label={zh ? "组件交互预览" : "Interactive component preview"}
        >
          <HomeGlassPreview locale={locale} />
        </section>
      </main>
      <footer className="home-footer">
        <span className="home-stack">
          <span>React 19</span>
          <span>Base UI</span>
          <span>Tailwind CSS 4</span>
        </span>
        <span>
          {zh ? "用心设计，自由组合" : "Thoughtfully built, freely composed"}
        </span>
      </footer>
    </div>
  );
}
