import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { LocaleToggle } from "@workspace/ui/components/locale-toggle";
import { cn } from "cn";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import type { LanguageSelectProps } from "fumadocs-ui/layouts/shared/slots/language-select";
import type { ComponentProps } from "react";
import { Logo } from "../components/logo";
import { ThemeModeMenu } from "../components/theme-mode-menu";
import { ThemePanel } from "../components/theme-panel";
import { getLocale, isLocale, type Locale, localePath } from "./i18n";

function LayoutThemeSwitch() {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  return (
    <div className="flex items-center gap-1">
      <ThemeModeMenu locale={locale} />
      <ThemePanel locale={locale} />
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
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <LocaleToggle
      {...props}
      className={cn(className, "text-foreground")}
      value={locale ?? "en-US"}
      onValueChange={(next) => {
        if (isLocale(next))
          return navigate({
            to: localePath(next, location.pathname),
            search: location.search,
            hash: location.hash,
          });
      }}
      options={(
        locales ?? [
          { locale: "en-US", name: "English" },
          { locale: "zh-CN", name: "简体中文" },
        ]
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
  const { lang } = useParams({ strict: false });
  return (
    <div {...props} className={`flex items-center gap-1 ${className ?? ""}`}>
      <ThemeModeMenu locale={getLocale(lang)} />
      <ThemePanel locale={getLocale(lang)} />
      <LayoutLocaleSwitch />
    </div>
  );
}
