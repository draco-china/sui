import { defineI18n } from "fumadocs-core/i18n";
import { uiTranslations } from "fumadocs-ui/i18n";

export type Locale = "en-US" | "zh-CN";
export const locales: Locale[] = ["en-US", "zh-CN"];

export function isLocale(value: string): value is Locale {
  return value === "en-US" || value === "zh-CN";
}

export function getLocale(lang?: string): Locale {
  return lang === "zh-CN" ? "zh-CN" : "en-US";
}

export function localePath(locale: Locale, path: string): string {
  const cleanPath = path.replace(/^\/(en-US|zh-CN)(?=\/|$)/, "") || "/";
  if (locale === "en-US") return cleanPath;
  return cleanPath === "/" ? "/zh-CN" : `/zh-CN${cleanPath}`;
}

export const i18n = defineI18n({
  defaultLanguage: "en-US",
  languages: locales,
  hideLocale: "default-locale",
  fallbackLanguage: null,
});

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    "en-US": { displayName: "English" },
    "zh-CN": {
      displayName: "简体中文",
      "Search(search dialog)": "搜索文档",
      "Search(search trigger)": "搜索文档",
      "Open Search(search trigger)(aria-label)": "打开搜索",
      "Close Search(search dialog)(aria-label)": "关闭搜索",
      "No results found(search dialog)": "没有找到结果",
      "On this page(table of contents)": "本页目录",
      "Table of Contents(inline table of contents)": "目录",
      "No Headings(table of contents)": "本页没有标题",
      "Last updated on(page footer)": "最后更新",
      "Choose a language(language switcher)": "选择语言",
      "Choose a language(language switcher)(aria-label)": "选择语言",
      "Next Page(pagination)": "下一篇",
      "Previous Page(pagination)": "上一篇",
      "Edit on GitHub(edit page)": "在 GitHub 编辑",
      "Copy Text(code block)(aria-label)": "复制代码",
      "Copied Text(code block)(aria-label)": "已复制代码",
      "Copy Anchor Link(heading anchor)(aria-label)": "复制标题链接",
      "Copied Anchor Link(heading anchor)(aria-label)": "已复制标题链接",
      "Open Sidebar(sidebar)(aria-label)": "打开文档导航",
      "Close Sidebar(sidebar)(aria-label)": "关闭文档导航",
      "Toggle Menu(home layout header)(aria-label)": "切换菜单",
      "Open Sidebar(aria-label)": "打开文档导航",
      "Close Sidebar(aria-label)": "关闭文档导航",
      "Collapse Sidebar(sidebar)(aria-label)": "折叠导航",
      "Options(aria-label)": "页面选项",
      "Copy Markdown(page actions)": "复制 Markdown",
      "Copied Markdown(page actions)": "已复制 Markdown",
      "Open(page actions)": "打开",
      "View as Markdown(page actions)": "查看 Markdown",
      "Theme(site menu)": "外观",
      "Language(language switcher)": "语言",
    },
  });
