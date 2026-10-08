"use client";

import MonacoEditor, {
  type EditorProps,
  loader,
  type Monaco,
} from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "./monaco-features";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker?worker";
import { type RefObject, useEffect, useLayoutEffect, useState } from "react";
import type { ViewerThemes } from "../viewer/shiki";
import { applyEditorTheme } from "./monaco-theme";
import { createEditorWorkerLifecycle } from "./monaco-workers";

const workers = createEditorWorkerLifecycle({
  modelCount: () => monaco.editor.getModels().length,
  onModelDispose: (listener) => monaco.editor.onWillDisposeModel(listener),
});

const environment = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker?: (moduleId: string, label: string) => Worker;
  };
};
environment.MonacoEnvironment = {
  ...environment.MonacoEnvironment,
  getWorker(_moduleId, label) {
    if (label === "json") return workers.track(new JsonWorker());
    if (["css", "scss", "less"].includes(label))
      return workers.track(new CssWorker());
    if (["html", "handlebars", "razor"].includes(label))
      return workers.track(new HtmlWorker());
    if (["typescript", "javascript"].includes(label))
      return workers.track(new TypeScriptWorker());
    return workers.track(new EditorWorker());
  },
};
loader.config({ monaco: monaco as unknown as Monaco });
const languageLoads = new Map<string, Promise<unknown>>();
let reactTypesRegistered = false;
const reactEditorTypes = `
declare namespace JSX { interface IntrinsicElements { [element:string]: any } }
declare module "react" {
 export type ReactNode = any;
 export type ComponentType<P = any> = (props:P)=>ReactNode;
 export function useState<S>(initial:S|(()=>S)): [S,(value:S|((previous:S)=>S))=>void];
 export function useEffect(effect:()=>void|(()=>void), dependencies?:readonly unknown[]):void;
 export function useMemo<T>(factory:()=>T, dependencies?:readonly unknown[]):T;
 export function useCallback<T extends (...args:any[])=>any>(callback:T, dependencies?:readonly unknown[]):T;
 const React:{createElement:(...args:any[])=>any}; export default React;
}
declare module "react/jsx-runtime" { export const jsx:any; export const jsxs:any; export const Fragment:any; }
`;

async function prepareLanguage(language: string) {
  let id = language;
  if (language === "tsx") id = "typescript";
  else if (language === "jsx") id = "javascript";
  if (!monaco.languages.getLanguages().some((item) => item.id === id))
    monaco.languages.register({ id });
  if (languageLoads.has(id)) return languageLoads.get(id);
  let task: Promise<unknown>;
  if (id === "typescript" || id === "javascript") {
    task = import("monaco-editor/languages/features/typescript/register").then(
      (ts) => {
        workers.registerReset("typescript", () => {
          ts.typescriptDefaults.setCompilerOptions(
            ts.typescriptDefaults.getCompilerOptions(),
          );
          ts.javascriptDefaults.setCompilerOptions(
            ts.javascriptDefaults.getCompilerOptions(),
          );
        });
        if (!reactTypesRegistered) {
          ts.typescriptDefaults.setCompilerOptions({
            jsx: ts.JsxEmit.ReactJSX,
            allowNonTsExtensions: true,
            target: ts.ScriptTarget.Latest,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
          });
          ts.javascriptDefaults.setCompilerOptions({
            jsx: ts.JsxEmit.ReactJSX,
            allowJs: true,
            checkJs: false,
            target: ts.ScriptTarget.Latest,
          });
          ts.typescriptDefaults.addExtraLib(
            reactEditorTypes,
            "file:///node_modules/@types/react/index.d.ts",
          );
          ts.javascriptDefaults.addExtraLib(
            reactEditorTypes,
            "file:///node_modules/@types/react/index.d.ts",
          );
          reactTypesRegistered = true;
        }
      },
    );
  } else if (id === "json") {
    task = import("monaco-editor/languages/features/json/register").then(
      (json) => {
        workers.registerReset("json", () =>
          json.jsonDefaults.setDiagnosticsOptions(
            json.jsonDefaults.diagnosticsOptions,
          ),
        );
      },
    );
  } else if (["css", "scss", "less"].includes(id)) {
    task = import("monaco-editor/languages/features/css/register").then(
      (css) => {
        workers.registerReset("css", () => {
          for (const defaults of [
            css.cssDefaults,
            css.scssDefaults,
            css.lessDefaults,
          ])
            defaults.setOptions(defaults.options);
        });
      },
    );
  } else if (id === "html") {
    task = import("monaco-editor/languages/features/html/register").then(
      (html) => {
        workers.registerReset("html", () => {
          for (const defaults of [
            html.htmlDefaults,
            html.handlebarDefaults,
            html.razorDefaults,
          ])
            defaults.setOptions(defaults.options);
        });
      },
    );
  } else {
    task = Promise.resolve();
  }
  languageLoads.set(id, task);
  try {
    return await task;
  } catch (error) {
    languageLoads.delete(id);
    throw error;
  }
}
export default function LocalMonacoEditor({
  errorLabel,
  themeMode,
  themeElement,
  shikiThemes,
  ...props
}: EditorProps & {
  errorLabel: string;
  themeMode: "light" | "dark";
  themeElement: RefObject<HTMLElement | null>;
  shikiThemes: ViewerThemes;
}) {
  useLayoutEffect(() => workers.acquire(), []);
  const language = props.language ?? "plaintext";
  const [state, setState] = useState<{
    language: string;
    failed: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    prepareLanguage(language)
      .then(async () => {
        if (themeElement.current)
          await applyEditorTheme(
            monaco as unknown as Monaco,
            themeMode,
            themeElement.current,
            props.theme ?? "vs",
            () => active,
            language,
            shikiThemes,
          );
      })
      .then(() => {
        if (active) setState({ language, failed: false });
      })
      .catch(() => {
        if (active) setState({ language, failed: true });
      });
    return () => {
      active = false;
    };
  }, [language, themeElement, themeMode, shikiThemes, props.theme]);
  if (state?.language !== language) return props.loading;
  if (state.failed)
    return (
      <div role="alert" className="p-4 text-destructive text-sm">
        {errorLabel}
      </div>
    );
  let modelLanguage = language;
  if (language === "tsx") modelLanguage = "typescript";
  else if (language === "jsx") modelLanguage = "javascript";
  return <MonacoEditor {...props} language={modelLanguage} />;
}
