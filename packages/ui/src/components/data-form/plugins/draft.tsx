"use client";

import { useSelector } from "@tanstack/react-form";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { HistoryIcon } from "lucide-react";
import { useEffect } from "react";
import { usePluginState, useValuesSettled } from "../context";
import { hiddenNames } from "../engine";
import { omitPath } from "../path";
import type {
  DataFormInstance,
  DataFormPlugin,
  DataFormValues,
} from "../types";

export interface PersistDraftOptions {
  /** The localStorage key; use one per form. */
  readonly key: string;
  /** More fields to leave out; passwords and hidden fields always are. */
  readonly exclude?: readonly string[];
}

interface Draft {
  readonly values: DataFormValues;
  /** What plugins keep through `persistKeys`, such as the current step. */
  readonly state?: Readonly<Record<string, unknown>>;
}

const PENDING = "draft.pending";
/** The values a submit sent; a save still waiting must not write them back. */
const SUBMITTED = "draft.submitted";

function read(key: string): Draft | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, draft: Draft | undefined) {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    // Private windows and full storage keep the form working without drafts.
  }
}

function draftValues(
  form: DataFormInstance,
  options: PersistDraftOptions,
): DataFormValues {
  let values = form.api.state.values;
  const skip = new Set(options.exclude);
  for (const entry of form.registry.values())
    if (entry.persist === false) skip.add(entry.name);
  for (const name of hiddenNames(form.registry.values(), values))
    skip.add(name);
  for (const name of skip) values = omitPath(values, name);
  return values;
}

function pluginState(form: DataFormInstance) {
  const keys = form.plugins.flatMap((plugin) => plugin.persistKeys ?? []);
  if (!keys.length) return undefined;
  return Object.fromEntries(
    keys.map((key) => [key, form.pluginStore.get(key)] as const),
  );
}

function useDraft(form: DataFormInstance, options: PersistDraftOptions) {
  const [, setPending] = usePluginState<Draft | undefined>(
    form,
    PENDING,
    undefined,
  );
  useEffect(() => {
    const saved = read(options.key);
    if (saved) setPending(saved);
  }, [options.key, setPending]);

  useValuesSettled(
    form,
    () => {
      const { values, isDirty } = form.api.state;
      // Waits until a found draft is restored or discarded, and leaves a
      // submitted form alone until it is edited again.
      if (!isDirty || form.pluginStore.get(PENDING)) return;
      if (form.pluginStore.get(SUBMITTED) === values) return;
      write(options.key, {
        values: draftValues(form, options),
        state: pluginState(form),
      });
    },
    500,
  );
}

function DraftNotice({
  form,
  options,
}: {
  form: DataFormInstance;
  options: PersistDraftOptions;
}) {
  const [pending, setPending] = usePluginState<Draft | undefined>(
    form,
    PENDING,
    undefined,
  );
  if (!pending) return null;
  const { labels } = form;
  return (
    <Alert data-slot="data-form-draft">
      <HistoryIcon aria-hidden />
      <AlertDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="me-auto">{labels.draftFound}</span>
        <span className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              write(options.key, undefined);
              setPending(undefined);
            }}
          >
            {labels.discardDraft}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              form.setValues(pending.values);
              for (const [key, value] of Object.entries(pending.state ?? {}))
                form.pluginStore.set(key, value);
              setPending(undefined);
            }}
          >
            {labels.restoreDraft}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Keeps unsent changes in localStorage and offers to restore them next
 * time. Passwords and hidden fields are never stored.
 */
export function persistDraft(options: PersistDraftOptions): DataFormPlugin {
  return {
    name: "persistDraft",
    setup: (form) => useDraft(form, options),
    slots: { header: (form) => <DraftNotice form={form} options={options} /> },
    onFinished: (form) => {
      write(options.key, undefined);
      form.pluginStore.set(SUBMITTED, form.api.state.values);
    },
  };
}

/** Asks before leaving the page while the form has unsaved changes. */
export function confirmLeave(): DataFormPlugin {
  return {
    name: "confirmLeave",
    setup: (form) => {
      const dirty = useSelector(form.api.store, (state) => state.isDirty);
      useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => {
          event.preventDefault();
          // Safari and older Chromium ask only when `returnValue` is set.
          event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
      }, [dirty]);
    },
  };
}
