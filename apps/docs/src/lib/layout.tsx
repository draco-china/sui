import { useParams } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { LocaleToggle } from "@workspace/ui/components/locale-toggle";
import { cn } from "cn";
import { SidebarTrigger } from "fumadocs-ui/components/sidebar/base";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import type { LanguageSelectProps } from "fumadocs-ui/layouts/shared/slots/language-select";
import { useSpaciousLayout } from "fumadocs-ui/layouts/spacious";
import { PanelLeft } from "lucide-react";
import type { ComponentProps } from "react";
import { GitHubLink } from "../components/github-link";
import { Logo } from "../components/logo";
import { ThemeModeMenu } from "../components/theme-mode-menu";
import { ThemePanel } from "../components/theme-panel";
import {
  defaultLocale,
  getLocale,
  type Locale,
  localeNames,
  localePath,
  locales as supportedLocales,
} from "./i18n";
import { useLocaleNavigation } from "./locale-navigation";

/** The GitHub link and appearance menus shown beside every layout's title. */
function SiteActions() {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  return (
    <>
      <GitHubLink />
      <ThemeModeMenu locale={locale} />
      <ThemePanel locale={locale} />
    </>
  );
}

function LayoutThemeSwitch() {
  return (
    <div className="flex items-center gap-1">
      <SiteActions />
    </div>
  );
}

export function LayoutLocaleSwitch({
  children: _children,
  variant: _variant,
  className,
  ...props
}: LanguageSelectProps) {
  const { locale, locales } = useI18n();
  const changeLocale = useLocaleNavigation();
  return (
    <LocaleToggle
      {...props}
      className={cn(className, "text-foreground")}
      value={locale ?? defaultLocale}
      onValueChange={changeLocale}
      options={(
        locales ??
        supportedLocales.map((item) => ({
          locale: item,
          name: localeNames[item],
        }))
      ).map((item) => ({ value: item.locale, label: item.name }))}
      label={locale === "zh-CN" ? "切换语言" : "Change language"}
    />
  );
}
function LayoutLocaleText(props: ComponentProps<"span">) {
  const { locale, locales } = useI18n();
  return (
    <span {...props}>
      {locales?.find((item) => item.locale === locale)?.name}
    </span>
  );
}

export function layoutOptions(locale: Locale): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
      url: localePath(locale, "/"),
    },
    links: [
      {
        text: "Docs",
        url: localePath(locale, "/docs"),
        active: "nested-url",
      },
      {
        text: "Components",
        url: localePath(locale, "/docs/components"),
        active: "nested-url",
      },
    ],
    slots: {
      themeSwitch: LayoutThemeSwitch,
      languageSelect: { root: LayoutLocaleSwitch, text: LayoutLocaleText },
    },
  };
}

export function DocumentationActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("flex items-center gap-1", className)}>
      <SiteActions />
      <LayoutLocaleSwitch />
    </div>
  );
}

export function DocumentationMobileHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  const { slots } = useSpaciousLayout();
  return (
    <header
      {...props}
      id="nd-subnav"
      className={cn(
        "sticky top-(--fd-banner-height,0px) z-30 flex h-(--fd-header-height) items-center bg-fd-card ps-4 pe-2.5 [grid-area:header] md:hidden",
        className,
      )}
    >
      <slots.navTitle className="me-auto inline-flex items-center gap-2.5 font-semibold" />
      <GitHubLink />
      {slots.searchTrigger && (
        <slots.searchTrigger.sm hideIfDisabled className="p-2" />
      )}
      <SidebarTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <PanelLeft />
      </SidebarTrigger>
    </header>
  );
}
