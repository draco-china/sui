"use client";
import {
  CodeViewer,
  codeViewerLabelsZhCN,
  ShikiProvider,
} from "@workspace/ui/viewers/code-viewer";
import type { ExampleProps } from "../types";

const themes = { light: "github-light", dark: "github-dark" } as const;
const languages = ["python", "sql"] as const;
const code =
  'def greeting(name: str):\n    return f"Hello, {name}"\n\nprint(greeting("SUI"))';
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <ShikiProvider themes={themes} languages={languages}>
      <div className="w-full rounded-xl bg-muted p-4">
        <CodeViewer
          code={code}
          language="python"
          variant="plain"
          highlightLines={[2]}
          className="[--code-highlight-bg:var(--accent)]"
          labels={chinese ? codeViewerLabelsZhCN : undefined}
        />
      </div>
    </ShikiProvider>
  );
}
