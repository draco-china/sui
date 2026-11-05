"use client";

import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";
import { usePluginState } from "../context";
import { focusFirstError, nextFrame } from "../dom";
import { DataFormCancel, DataFormFooter, DataFormSubmit } from "../parts";
import type { DataFormInstance, DataFormPlugin } from "../types";

const STEP_KEY = "steps.current";

export interface DataFormStep {
  /** Fields join a step with `step: "<key>"`. */
  readonly key: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
}

export interface StepsOptions {
  readonly items: readonly DataFormStep[];
  /** The current step's index, when the page controls it. */
  readonly current?: number;
  readonly onCurrentChange?: (index: number) => void;
}

function headingId(form: DataFormInstance) {
  return `${form.id}-step-title`;
}

function StepsHeader({
  form,
  options,
  go,
}: {
  form: DataFormInstance;
  options: StepsOptions;
  go: (index: number) => void;
}) {
  const [stored] = usePluginState(form, STEP_KEY, 0);
  const current = options.current ?? stored;
  const { items } = options;
  const step = items[current];
  return (
    <div data-slot="data-form-steps" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:hidden">
        <span className="text-muted-foreground text-sm tabular-nums">
          {form.labels.stepOf(current + 1, items.length)}
        </span>
        <Progress
          value={((current + 1) / items.length) * 100}
          aria-label={form.labels.stepOf(current + 1, items.length)}
        />
      </div>
      <ol className="hidden items-center gap-2 md:flex">
        {items.map((item, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={item.key}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!done}
                className="min-w-0 gap-2 px-2 disabled:opacity-100"
                onClick={() => go(index)}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                    active || done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "truncate",
                    active ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {item.title}
                </span>
              </Button>
              {index < items.length - 1 ? (
                <span aria-hidden className="h-px min-w-4 flex-1 bg-border" />
              ) : null}
            </li>
          );
        })}
      </ol>
      {step ? (
        <div className="flex flex-col gap-1.5">
          <h3
            id={headingId(form)}
            tabIndex={-1}
            className="font-semibold text-base outline-none"
          >
            {step.title}
          </h3>
          {step.description ? (
            <p className="text-muted-foreground text-sm">{step.description}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StepsFooter({
  form,
  options,
  go,
}: {
  form: DataFormInstance;
  options: StepsOptions;
  go: (index: number) => void;
}) {
  const [stored] = usePluginState(form, STEP_KEY, 0);
  const current = options.current ?? stored;
  const last = current >= options.items.length - 1;
  return (
    <DataFormFooter>
      {/* In a dialog, Cancel comes first, as in its own footer. */}
      <DataFormCancel />
      {current > 0 ? (
        <Button type="button" variant="outline" onClick={() => go(current - 1)}>
          {form.labels.previous}
        </Button>
      ) : null}
      {last ? (
        <DataFormSubmit />
      ) : (
        // A submit button, so Enter in a field moves on as well.
        <Button type="submit">{form.labels.next}</Button>
      )}
    </DataFormFooter>
  );
}

/**
 * Splits the form into steps. Every field stays mounted, so values carry
 * across steps and the final submit sends them all; Next validates only the
 * current step's fields.
 */
export function steps(options: StepsOptions): DataFormPlugin {
  const currentOf = (form: DataFormInstance) =>
    options.current ?? form.pluginStore.get<number>(STEP_KEY) ?? 0;
  const goTo = (form: DataFormInstance, index: number) => {
    const next = Math.max(0, Math.min(index, options.items.length - 1));
    if (options.current === undefined) form.pluginStore.set(STEP_KEY, next);
    options.onCurrentChange?.(next);
    nextFrame(() => document.getElementById(headingId(form))?.focus());
  };
  const namesIn = (form: DataFormInstance, index: number) => {
    const key = options.items[index]?.key;
    return [...form.registry.values()]
      .filter((entry) => entry.step === key)
      .map((entry) => entry.name);
  };
  return {
    name: "steps",
    // A restored draft opens on the step it was saved on.
    persistKeys: [STEP_KEY],
    isFieldShown: (field, form) =>
      !field.step || field.step === options.items[currentOf(form)]?.key,
    beforeSubmit: async (form) => {
      const current = currentOf(form);
      if (current >= options.items.length - 1) return true;
      if (await form.validateFields(namesIn(form, current)))
        goTo(form, current + 1);
      else focusFirstError(form);
      return false;
    },
    onSubmitInvalid: (form, names) => {
      const keys = options.items.map((item) => item.key);
      const steps = names
        .map((name) => keys.indexOf(form.registry.get(name)?.step ?? ""))
        .filter((index) => index >= 0);
      if (steps.length) goTo(form, Math.min(...steps));
    },
    onReset: (form) => {
      if (options.current === undefined) form.pluginStore.set(STEP_KEY, 0);
    },
    slots: {
      header: (form) => (
        <StepsHeader
          form={form}
          options={options}
          go={(index) => goTo(form, index)}
        />
      ),
      footer: (form) => (
        <StepsFooter
          form={form}
          options={options}
          go={(index) => goTo(form, index)}
        />
      ),
    },
  };
}
