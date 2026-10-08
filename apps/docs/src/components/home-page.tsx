import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "@workspace/ui/components/copy-icon";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useClipboard } from "@workspace/ui/hooks/use-clipboard";
import { ArrowRight, ArrowUpRight, Check, CheckCheck } from "lucide-react";
import { useId, useState } from "react";
import { type Locale, localePath } from "../lib/i18n";
import { LayoutLocaleSwitch } from "../lib/layout";
import { Logo } from "./logo";
import { ThemeModeMenu } from "./theme-mode-menu";
import { ThemePanel } from "./theme-panel";

const snippet = 'import { Button } from "@workspace/ui/components/button";';
const featuredComponents = ["Button", "Input", "Switch", "Tabs"];

function SettingsPreview({ zh }: { zh: boolean }) {
  const labels = zh
    ? {
        save: "保存设置",
        saved: "已保存",
        savedFeedback: "设置已在此预览中更新",
      }
    : {
        save: "Save changes",
        saved: "Saved",
        savedFeedback: "Your preview preferences are updated",
      };
  const [email, setEmail] = useState("hello@example.com");
  const [updates, setUpdates] = useState(true);
  const [saved, setSaved] = useState(false);
  const [clicked, setClicked] = useState<string | null>(null);
  const emailId = useId();
  const updatesId = useId();
  const activityId = useId();
  return (
    <div className="hero-preview">
      <div className="preview-heading">
        <Logo markOnly />
        <h2>{zh ? "让界面，成为你的" : "Make it yours"}</h2>
        <p>
          {zh ? "几个组件，一个完整界面" : "A few components, one interface"}
        </p>
      </div>
      <Tabs defaultValue="account">
        <TabsList
          variant="line"
          wrapperClassName="w-full"
          className="w-full justify-start border-border border-b"
        >
          <TabsTrigger value="account">{zh ? "账户" : "Account"}</TabsTrigger>
          <TabsTrigger value="notifications">
            {zh ? "通知" : "Notifications"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              setSaved(true);
            }}
          >
            <label htmlFor={emailId}>{zh ? "邮箱地址" : "Email address"}</label>
            <Input
              className="rounded-lg border-border bg-card"
              id={emailId}
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSaved(false);
              }}
            />
            <div className="setting-switch-row">
              <div className="setting-switch-copy">
                <label htmlFor={updatesId}>
                  {zh ? "产品更新" : "Product updates"}
                </label>
                <p>
                  {zh
                    ? "接收新功能和版本更新通知"
                    : "Get the latest news and feature updates"}
                </p>
              </div>
              <Switch
                id={updatesId}
                checked={updates}
                onCheckedChange={(value) => {
                  setUpdates(value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="settings-save">
              <Button type="submit">
                {saved ? (
                  <>
                    <CheckCheck />
                    {labels.saved}
                  </>
                ) : (
                  labels.save
                )}
              </Button>
              <span className="settings-feedback" role="status">
                {saved ? labels.savedFeedback : ""}
              </span>
            </div>
          </form>
        </TabsContent>
        <TabsContent value="notifications">
          <div className="notification-settings">
            <h3>{zh ? "及时了解新动态" : "Stay in the loop"}</h3>
            <p>
              {zh
                ? "选择你希望在预览中接收的通知"
                : "Choose the notifications you want in this preview"}
            </p>
            <div className="setting-switch-row">
              <Switch id={activityId} defaultChecked />
              <label htmlFor={activityId}>
                {zh ? "账户动态" : "Account activity"}
              </label>
            </div>
            <div className="setting-switch-row">
              <Switch
                id={`${activityId}-updates`}
                checked={updates}
                onCheckedChange={(value) => {
                  setUpdates(value);
                  setSaved(false);
                }}
              />
              <label htmlFor={`${activityId}-updates`}>
                {zh ? "产品更新" : "Product updates"}
              </label>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <div className="button-preview-row">
        {(["default", "outline", "secondary"] as const).map((variant) => (
          <Button
            key={variant}
            variant={variant}
            onClick={() => setClicked(variant)}
          >
            {clicked === variant ? <Check /> : null}
            {zh
              ? { default: "默认", outline: "描边", secondary: "次要" }[variant]
              : {
                  default: "Default",
                  outline: "Outline",
                  secondary: "Secondary",
                }[variant]}
          </Button>
        ))}
      </div>
      <span className="sr-only" role="status">
        {clicked && `${clicked} ${zh ? "按钮已点击" : "button clicked"}`}
      </span>
    </div>
  );
}

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
            <Link
              className="home-primary-action"
              to={localePath(locale, "/docs/installation")}
            >
              {zh ? "开始使用" : "Get started"}
              <ArrowRight size={22} />
            </Link>
            <Link
              className="home-secondary-action"
              to={localePath(locale, "/docs/components")}
            >
              {zh ? "浏览组件" : "Browse components"}
              <ArrowUpRight size={19} />
            </Link>
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
          <Link
            className="floating-component"
            to={localePath(locale, "/docs/components/button")}
          >
            <code>{"<Button />"}</code>
            <ArrowUpRight size={17} />
          </Link>
          <SettingsPreview zh={zh} />
          <nav
            className="floating-components"
            aria-label={zh ? "探索预览中的组件" : "Explore these components"}
          >
            {featuredComponents.map((name) => (
              <Link
                key={name}
                to={localePath(
                  locale,
                  `/docs/components/${name.toLowerCase()}`,
                )}
              >
                {name}
              </Link>
            ))}
          </nav>
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
