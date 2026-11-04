"use client";

import { cn } from "cn";
import { FileCode2 } from "lucide-react";
import { type ComponentProps, Fragment, type ReactNode } from "react";
import { TooltipButton } from "../tooltip-button";
import { useCodeEditorContext } from "./context";
import { languageLabel } from "./languages";

export function CodeEditorToolbarButton({
  size,
  variant = "ghost",
  className,
  ...props
}: Readonly<ComponentProps<typeof TooltipButton>>) {
  const editor = useCodeEditorContext();
  return (
    <TooltipButton
      size={size ?? editor.size}
      variant={variant}
      className={cn(
        "text-muted-foreground hover:bg-background/70 hover:text-foreground [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/** The file icon and title. Defaults to the language name. */
export function CodeEditorTitle({
  className,
  children,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  const editor = useCodeEditorContext();
  return (
    <>
      <FileCode2
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/70"
      />
      <span
        className={cn(
          "min-w-20 flex-1 truncate font-medium font-mono text-foreground/80 text-sm",
          className,
        )}
      >
        {children ?? languageLabel(editor.language)}
      </span>
    </>
  );
}

/** Children first, then each plugin's toolbar item in plugin order. */
export function CodeEditorActions({
  className,
  children,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  const editor = useCodeEditorContext();
  return (
    <div
      className={cn(
        "ms-auto flex shrink-0 flex-wrap items-center justify-end gap-1",
        className,
      )}
    >
      {children}
      {editor.plugins.map(
        (plugin) =>
          plugin.toolbar && (
            <Fragment key={plugin.name}>{plugin.toolbar(editor)}</Fragment>
          ),
      )}
    </div>
  );
}

export interface CodeEditorToolbarProps {
  readonly className?: string;
  /** Replaces the default title and actions. */
  readonly children?: ReactNode;
}

export function CodeEditorToolbar({
  className,
  children,
}: Readonly<CodeEditorToolbarProps>) {
  return (
    <div
      data-slot="code-editor-toolbar"
      className={cn(
        "flex min-h-10 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/80 px-3 py-1",
        className,
      )}
    >
      {children ?? (
        <>
          <CodeEditorTitle />
          <CodeEditorActions />
        </>
      )}
    </div>
  );
}
