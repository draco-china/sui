"use client";

import { useSelector } from "@tanstack/react-form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import { cn } from "cn";
import { ChevronDownIcon, CircleAlertIcon } from "lucide-react";
import {
  type ComponentProps,
  type FormEvent,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
} from "react";
import {
  type DataFormLayout,
  DataFormLayoutProvider,
  DataFormProvider,
  useDataFormContext,
  useDataFormFill,
  useDataFormLayout,
  usePluginState,
  useValuesSettled,
} from "./context";
import { fieldIds, formElementId } from "./dom";
import { invalidNames } from "./engine";
import type { DataFormInstance, DataFormPlugin } from "./types";
import { sameList } from "./use-field";
import { nodeText } from "./value-types/shared";

function PluginSetup({
  plugin,
  form,
}: {
  plugin: DataFormPlugin;
  form: DataFormInstance;
}) {
  plugin.setup?.(form);
  return null;
}

/** Submits once typing pauses, for `submitOn="change"`. */
function SubmitOnChange({ form }: { form: DataFormInstance }) {
  useValuesSettled(form, () => void form.submit(), 300);
  return null;
}

export interface DataFormCollapse {
  /** Fields shown while collapsed; defaults to 3. */
  readonly count?: number;
  readonly defaultCollapsed?: boolean;
}

export interface DataFormRootProps
  extends Omit<ComponentProps<"form">, "onSubmit"> {
  readonly form: DataFormInstance;
  readonly layout?: DataFormLayout;
  /** Grid columns on wide containers, for `layout="grid"`. */
  readonly columns?: 1 | 2 | 3 | 4;
  /** Shows the first fields and an Expand button for the rest. */
  readonly collapse?: boolean | DataFormCollapse;
  /** `sm` for compact toolbars: 32px controls in a light row. */
  readonly size?: "sm" | "default";
}

const COLLAPSE_KEY = "collapsed";

/**
 * The `<form>` with its providers. Every other part reads the form from
 * here, so pages can lay the parts out themselves.
 */
export function DataFormRoot({
  form,
  layout = "vertical",
  columns,
  collapse,
  size = "default",
  className,
  children,
  onKeyDown,
  ...props
}: DataFormRootProps) {
  // Plain values, so an inline `collapse={{ count }}` keeps the context
  // stable and fields don't render again with every parent render.
  const collapsible = Boolean(collapse);
  const settings = typeof collapse === "object" ? collapse : {};
  const collapseCount = collapsible ? (settings.count ?? 3) : undefined;
  const fill = useDataFormFill();
  const [collapsed] = usePluginState(
    form,
    COLLAPSE_KEY,
    collapsible && settings.defaultCollapsed !== false,
  );
  const layoutState = useMemo(
    () => ({
      layout,
      columns: columns ?? (layout === "grid" ? 3 : 1),
      collapseCount,
      collapsed: collapsible && collapsed,
      size,
    }),
    [layout, columns, collapseCount, collapsible, collapsed, size],
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A form inside a portal (a filter popover) must not submit this one.
    event.stopPropagation();
    void form.submit();
  };
  const keyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    onKeyDown?.(event);
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void form.submit();
    }
  };

  return (
    <DataFormProvider form={form}>
      <DataFormLayoutProvider value={layoutState}>
        {form.plugins.map((plugin) => (
          <PluginSetup key={plugin.name} plugin={plugin} form={form} />
        ))}
        {form.submitOn === "change" ? <SubmitOnChange form={form} /> : null}
        <form
          id={formElementId(form)}
          noValidate
          data-slot="data-form"
          data-layout={layout}
          aria-busy={form.loading || undefined}
          className={cn(
            "@container/data-form flex flex-col",
            layout === "light" ? "gap-2" : "gap-6",
            // In a dialog the parts sit edge to edge: fields scroll between
            // the headers and the footer.
            fill && "min-h-0 flex-1 gap-0",
            className,
          )}
          onSubmit={submit}
          onKeyDown={keyDown}
          {...props}
        >
          <PluginHeaders form={form} fill={fill} />
          {children}
        </form>
      </DataFormLayoutProvider>
    </DataFormProvider>
  );
}

function PluginHeaders({
  form,
  fill,
}: {
  form: DataFormInstance;
  fill: boolean;
}) {
  const headers = form.plugins.map((plugin) => (
    <Fragment key={plugin.name}>{plugin.slots?.header?.(form)}</Fragment>
  ));
  if (!fill) return headers;
  // Hidden while every header renders nothing.
  return (
    <div className="flex shrink-0 flex-col gap-4 px-6 pb-4 empty:hidden">
      {headers}
    </div>
  );
}

export function DataFormFooter({
  sticky = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  /** Keeps the buttons in view at the bottom of a long form. */
  readonly sticky?: boolean;
}) {
  const fill = useDataFormFill();
  return (
    <div
      data-slot="data-form-footer"
      data-sticky={sticky || undefined}
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        sticky && "sticky bottom-0 z-10 border-t bg-background py-3",
        // Below the scrolling fields of a dialog, as a sticky footer is.
        fill && "shrink-0 border-t px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

/** Shows a spinner and is disabled only while the request is in flight. */
export function DataFormSubmit({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  const form = useDataFormContext();
  const submitting = useSelector(form.api.store, (state) => state.isSubmitting);
  return (
    <Button
      type="submit"
      data-slot="data-form-submit"
      disabled={submitting || form.loading}
      aria-busy={submitting || undefined}
      {...props}
    >
      {submitting ? <Loader size="sm" label={form.labels.submitting} /> : null}
      {children ?? form.labels.submit}
    </Button>
  );
}

export function DataFormReset({
  children,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const form = useDataFormContext();
  const submitting = useSelector(form.api.store, (state) => state.isSubmitting);
  return (
    <Button
      type="button"
      variant="outline"
      data-slot="data-form-reset"
      disabled={submitting}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) form.reset();
      }}
      {...props}
    >
      {children ?? form.labels.reset}
    </Button>
  );
}

/** The plugin that gives the form a Cancel button, such as `dialog()`. */
function cancelPlugin(form: DataFormInstance) {
  return form.plugins.find((plugin) => plugin.onCancel);
}

/** Cancel, when a plugin such as `dialog()` gives the form one. */
export function DataFormCancel({
  children,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const form = useDataFormContext();
  const plugin = cancelPlugin(form);
  if (!plugin) return null;
  return (
    <Button
      type="button"
      variant="outline"
      data-slot="data-form-cancel"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) plugin.onCancel?.(form);
      }}
      {...props}
    >
      {children ?? form.labels.cancel}
    </Button>
  );
}

/** Expand and collapse the fields past `collapse.count`. */
export function DataFormCollapseToggle() {
  const form = useDataFormContext();
  const { collapsed, collapseCount } = useDataFormLayout();
  const [, setCollapsed] = usePluginState(form, COLLAPSE_KEY, true);
  if (collapseCount === undefined || form.fields.length <= collapseCount)
    return null;
  return (
    <Button
      type="button"
      variant="ghost"
      data-slot="data-form-collapse"
      aria-expanded={!collapsed}
      onClick={() => setCollapsed(!collapsed)}
    >
      {collapsed ? form.labels.expand : form.labels.collapse}
      <ChevronDownIcon
        aria-hidden
        className={cn(
          "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          !collapsed && "rotate-180",
        )}
      />
    </Button>
  );
}

/**
 * The form's own error and, after a failed submit of a long form, a list
 * of the fields to fix. Each entry moves focus to its field.
 */
export function DataFormErrorSummary({
  className,
  minErrors = 3,
}: {
  readonly className?: string;
  /** Lists fields once at least this many have errors. */
  readonly minErrors?: number;
}) {
  const form = useDataFormContext();
  const fill = useDataFormFill();
  const attempted = useSelector(
    form.api.store,
    (state) => state.submissionAttempts > 0,
  );
  const names = useSelector(form.api.store, invalidNames, {
    compare: sameList,
  });
  const listed = attempted && names.length >= minErrors;
  if (!form.formError && !listed) return null;
  const focus = (name: string) =>
    document.getElementById(fieldIds(form, name).control)?.focus();
  return (
    <Alert
      variant="destructive"
      data-slot="data-form-error-summary"
      className={cn(fill && "mx-6 mb-4 w-auto shrink-0", className)}
    >
      <CircleAlertIcon aria-hidden />
      <AlertTitle>
        {form.formError ?? form.labels.errorSummary(names.length)}
      </AlertTitle>
      {listed ? (
        <AlertDescription>
          <ul className="flex flex-col gap-1">
            {names.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => focus(name)}
                >
                  {nodeText(form.registry.get(name)?.label) || name}
                </button>
              </li>
            ))}
          </ul>
        </AlertDescription>
      ) : null}
    </Alert>
  );
}

/**
 * A plugin footer such as the steps' Previous and Next, the `submitter`, or
 * Reset and Submit. When a plugin such as `dialog()` gives the form a
 * Cancel, it takes Reset's place.
 */
export function DataFormActions({
  submitter,
  sticky,
}: {
  readonly submitter?: false | ReactNode;
  readonly sticky?: boolean;
}) {
  const form = useDataFormContext();
  const { layout } = useDataFormLayout();
  const footer = form.plugins.find((plugin) => plugin.slots?.footer);
  if (footer) return footer.slots?.footer?.(form);
  if (submitter === false) return null;
  const cancellable = Boolean(cancelPlugin(form));
  if (form.readonly)
    return cancellable ? (
      <DataFormFooter sticky={sticky}>
        <DataFormCancel />
      </DataFormFooter>
    ) : null;
  if (submitter !== undefined)
    return <DataFormFooter sticky={sticky}>{submitter}</DataFormFooter>;
  if (layout === "light") return null;
  const query = layout === "grid";
  return (
    <DataFormFooter sticky={sticky}>
      {query ? <DataFormCollapseToggle /> : null}
      {cancellable ? <DataFormCancel /> : <DataFormReset />}
      <DataFormSubmit>{query ? form.labels.query : undefined}</DataFormSubmit>
    </DataFormFooter>
  );
}
