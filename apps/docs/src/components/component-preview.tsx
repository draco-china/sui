import { useParams } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "@workspace/ui/components/copy-icon";
import { DirectionProvider } from "@workspace/ui/components/direction";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  type ClipboardStatus,
  createClipboardController,
} from "@workspace/ui/hooks/use-clipboard";
import { cn } from "cn";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import {
  type ComponentType,
  lazy,
  Suspense,
  use,
  useEffect,
  useState,
} from "react";
import { examples, sourceFiles } from "../examples";
import type { ExampleProps } from "../examples/types";
import { getLocale } from "../lib/i18n";
import { CodePre } from "./code-block";

const demoComponents = new Map<
  string,
  ReturnType<typeof lazy<ComponentType<ExampleProps>>>
>();
const sourcePromises = new Map<string, Promise<{ default: string }>>();

function ExampleSkeleton({
  kind,
  label,
}: {
  kind: "preview" | "code";
  label: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      data-slot={`${kind}-skeleton`}
      className={kind === "code" ? "min-h-60 w-full p-5" : "w-full max-w-sm"}
    >
      <span className="sr-only">{label}</span>
      {kind === "code" ? (
        <div aria-hidden="true" className="space-y-3">
          {[
            "w-4/5",
            "w-1/3",
            "w-3/5",
            "w-2/5",
            "w-5/6",
            "w-1/2",
            "w-2/3",
            "w-3/4",
          ].map((width) => (
            <Skeleton key={width} className={cn("h-3 rounded-sm", width)} />
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2 rounded-sm" />
              <Skeleton className="h-3 w-3/4 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      )}
    </div>
  );
}

function getDemo(name: string) {
  const key = name as keyof typeof examples;
  if (!(key in examples)) return undefined;
  let component = demoComponents.get(name);
  if (!component) {
    component = lazy(examples[key]);
    demoComponents.set(name, component);
  }
  return component;
}

function DemoCode({ name }: { name: string }) {
  const key = name as keyof typeof sourceFiles;
  if (!(key in sourceFiles)) return null;
  let promise = sourcePromises.get(name);
  if (!promise) {
    promise = sourceFiles[key]();
    sourcePromises.set(name, promise);
  }
  const code = use(promise).default;
  return (
    <DynamicCodeBlock
      lang="tsx"
      code={code}
      options={{
        themes: { light: "github-light", dark: "github-dark" },
        components: { pre: CodePre },
      }}
    />
  );
}

export function ComponentSource({ name }: { name: string }) {
  const { lang } = useParams({ strict: false });
  return (
    <Suspense
      fallback={
        <ExampleSkeleton
          kind="code"
          label={
            getLocale(lang) === "zh-CN" ? "正在加载代码…" : "Loading code…"
          }
        />
      }
    >
      <DemoCode name={name} />
    </Suspense>
  );
}

export function ComponentPreview({
  name,
  align = "center",
  previewClassName,
  direction,
}: {
  name: string;
  align?: "start" | "center";
  previewClassName?: string;
  direction?: "rtl" | "ltr";
}) {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  const chinese = locale === "zh-CN";
  const Demo = getDemo(name);
  const [copyStatus, setCopyStatus] = useState<ClipboardStatus>("idle");
  const [clipboard] = useState(() =>
    createClipboardController({
      onStatusChange: setCopyStatus,
      writeText: async (exampleName) => {
        const key = exampleName as keyof typeof sourceFiles;
        if (!(key in sourceFiles)) throw new Error("Example source not found");
        let promise = sourcePromises.get(exampleName);
        if (!promise) {
          promise = sourceFiles[key]();
          sourcePromises.set(exampleName, promise);
        }
        const code = await promise;
        await navigator.clipboard.writeText(code.default);
      },
    }),
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing examples invalidates pending source copies and resets feedback.
  useEffect(() => {
    clipboard.activate();
    clipboard.reset();
    return () => clipboard.dispose();
  }, [clipboard, name]);

  if (!Demo) throw new Error(`Example not found: ${name}`);

  return (
    <Tabs
      defaultValue="preview"
      className="component-preview not-prose"
      data-example={name}
    >
      <div className="preview-toolbar">
        <TabsList variant="line">
          <TabsTrigger value="preview">
            {chinese ? "预览" : "Preview"}
          </TabsTrigger>
          <TabsTrigger value="code">{chinese ? "代码" : "Code"}</TabsTrigger>
        </TabsList>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={chinese ? "复制示例代码" : "Copy example code"}
          disabled={copyStatus === "pending"}
          onClick={() => clipboard.copy(name)}
        >
          <CopyIcon
            status={copyStatus}
            className={cn(copyStatus === "error" && "text-destructive")}
          />
        </Button>
      </div>
      <TabsContent
        value="preview"
        className={cn("preview-canvas", previewClassName)}
        data-align={align}
        dir={direction}
      >
        <Suspense
          fallback={
            <ExampleSkeleton
              kind="preview"
              label={chinese ? "正在加载示例…" : "Loading example…"}
            />
          }
        >
          <DirectionProvider direction={direction ?? "ltr"}>
            <Demo locale={locale} />
          </DirectionProvider>
        </Suspense>
      </TabsContent>
      <TabsContent value="code" className="preview-code">
        <ComponentSource name={name} />
      </TabsContent>
      {copyStatus === "error" && (
        <p className="px-5 pb-3 text-sm" role="status">
          {chinese
            ? "无法自动复制，请在代码标签中手动复制"
            : "Copy unavailable. Select the code in the Code tab to copy it manually."}
        </p>
      )}
      {copyStatus === "copied" && (
        <span className="sr-only" role="status">
          {chinese ? "已复制" : "Copied"}
        </span>
      )}
    </Tabs>
  );
}
