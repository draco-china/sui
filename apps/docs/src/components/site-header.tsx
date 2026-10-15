import { Link } from "@tanstack/react-router";
import { type Locale, localePath } from "../lib/i18n";
import { LayoutLocaleSwitch } from "../lib/layout";
import { GitHubLink } from "./github-link";
import { Logo } from "./logo";
import { ThemeModeMenu } from "./theme-mode-menu";
import { ThemePanel } from "./theme-panel";

export function SiteHeader({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  return (
    <header className="home-header shrink-0" data-slot="site-header">
      <Link
        className="home-brand"
        to={localePath(locale, "/")}
        aria-label={zh ? "SUI 首页" : "SUI home"}
      >
        <Logo />
      </Link>
      <nav className="home-nav" aria-label={zh ? "主导航" : "Main navigation"}>
        <Link to={localePath(locale, "/docs")}>{zh ? "文档" : "Docs"}</Link>
        <Link to={localePath(locale, "/docs/components")}>
          {zh ? "组件" : "Components"}
        </Link>
        <Link to={localePath(locale, "/playground")}>
          {zh ? "组件体验" : "Playground"}
        </Link>
      </nav>
      <div className="home-header-actions">
        <GitHubLink />
        <ThemeModeMenu locale={locale} />
        <ThemePanel locale={locale} />
        <LayoutLocaleSwitch />
      </div>
    </header>
  );
}
