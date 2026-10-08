"use client";

import { useParams } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "@workspace/ui/components/copy-icon";
import { useClipboard } from "@workspace/ui/hooks/use-clipboard";
import {
  type CodeBlockProps,
  CodeBlock as FumadocsCodeBlock,
  Pre,
} from "fumadocs-ui/components/codeblock";
import { type ComponentProps, type RefObject, useRef } from "react";
import { getLocale } from "../lib/i18n";

function CodeCopyButton({
  figureRef,
  chinese,
}: {
  figureRef: RefObject<HTMLElement | null>;
  chinese: boolean;
}) {
  const { status, copy } = useClipboard("");
  const labels = chinese
    ? {
        idle: "复制代码",
        pending: "正在复制代码",
        copied: "代码已复制",
        error: "复制失败，请手动复制",
      }
    : {
        idle: "Copy code",
        pending: "Copying code",
        copied: "Code copied",
        error: "Copy failed. Copy manually.",
      };
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      disabled={status === "pending"}
      aria-busy={status === "pending"}
      aria-label={labels[status]}
      data-checked={status === "copied" || undefined}
      onClick={() => {
        const pre = figureRef.current?.querySelector("pre");
        if (!pre) return;
        const clone = pre.cloneNode(true) as HTMLElement;
        for (const ignored of clone.querySelectorAll(".nd-copy-ignore"))
          ignored.replaceWith("\n");
        void copy(clone.textContent ?? "");
      }}
    >
      <CopyIcon
        status={status}
        className={
          status === "error" ? "size-3.5 text-destructive" : "size-3.5"
        }
      />
      <span role="status" className="sr-only">
        {status === "copied" || status === "error" ? labels[status] : ""}
      </span>
    </Button>
  );
}

function CodeBlock({
  ref,
  Actions,
  allowCopy = true,
  ...props
}: CodeBlockProps) {
  const figureRef = useRef<HTMLElement | null>(null);
  const { lang } = useParams({ strict: false });
  const chinese = getLocale(lang) === "zh-CN";
  return (
    <FumadocsCodeBlock
      {...props}
      ref={(node) => {
        figureRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      allowCopy={false}
      Actions={({ className }) => {
        const children =
          allowCopy !== false && allowCopy !== "false" ? (
            <CodeCopyButton figureRef={figureRef} chinese={chinese} />
          ) : null;
        if (Actions) return Actions({ className, children });
        return <div className={className}>{children}</div>;
      }}
    />
  );
}

function CodePre(props: ComponentProps<"pre">) {
  return (
    <CodeBlock {...props}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}

export { CodeBlock, CodePre };
