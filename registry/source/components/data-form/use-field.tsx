"use client";

import { type AnyFieldApi, useField, useSelector } from "@tanstack/react-form";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { evaluateCondition } from "@/components/ui/data-form/conditions";
import { useDataFormContext, useDataFormLayout } from "@/components/ui/data-form/context";
import { fieldIds } from "@/components/ui/data-form/dom";
import {
  clearTriggers,
  errorText,
  fieldDependencies,
  isFieldHidden,
  isMissing,
  reactionValue,
  resolveFieldState,
  runValidatorSync,
} from "@/components/ui/data-form/engine";
import { getPath, isPathWithin } from "@/components/ui/data-form/path";
import type {
  DataFormFieldConfig,
  DataFormFieldState,
  DataFormInstance,
  DataFormValidator,
  DataFormValues,
} from "@/components/ui/data-form/types";
import {
  type DataFormOption,
  getValueType,
  type ValueControlProps,
  type ValueReadProps,
  type ValueTypeDefinition,
} from "@/components/ui/data-form/value-types";
import { editFieldProps, nodeText } from "@/components/ui/data-form/value-types/shared";

export function sameList(a: readonly unknown[], b: readonly unknown[]) {
  return (
    a.length === b.length && a.every((item, index) => Object.is(item, b[index]))
  );
}

/** A ref that always holds the latest value, for callbacks made once. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** The same array for as long as it names the same paths. */
function useStableNames<T extends readonly string[] | "all">(names: T): T {
  const key = names === "all" ? "\u0000all" : names.join("\n");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `names`.
  return useMemo(() => names, [key]);
}

/** Follows only the values at these paths, so typing elsewhere skips it. */
export function useWatched(
  form: DataFormInstance,
  names: readonly string[] | "all",
) {
  return useSelector(
    form.api.store,
    (state): readonly unknown[] =>
      names === "all"
        ? [state.values]
        : names.map((name) => getPath(state.values, name)),
    { compare: sameList },
  );
}

/**
 * Empties the fields whose `clearOnChange` follows `name`, and the fields
 * that follow those. Only edits clear: loading or restoring values that
 * belong together keeps them.
 */
function clearDependents(
  form: DataFormInstance,
  name: string,
  seen: Set<string> = new Set([name]),
) {
  for (const entry of form.registry.values()) {
    if (seen.has(entry.name)) continue;
    const follows = entry.clearOn?.some(
      (trigger) => isPathWithin(name, trigger) || isPathWithin(trigger, name),
    );
    if (!follows) continue;
    seen.add(entry.name);
    if (form.api.getFieldValue(entry.name) !== undefined)
      form.api.setFieldValue(entry.name, undefined);
    clearDependents(form, entry.name, seen);
  }
}

const optionCache = new WeakMap<
  object,
  Map<string, readonly DataFormOption[]>
>();
/** Answers kept per `request`, oldest dropped first. */
const OPTION_CACHE_SIZE = 50;

/** Options from `request`, loaded again when a dependency changes. */
function useRequestedOptions(
  config: DataFormFieldConfig,
  form: DataFormInstance,
  watched: readonly unknown[],
) {
  const request = config.request;
  const key = useMemo(() => {
    if (!request) return "";
    try {
      return JSON.stringify(watched);
    } catch {
      return String(Math.random());
    }
  }, [request, watched]);
  const [state, setState] = useState<{
    key: string | undefined;
    options: readonly DataFormOption[];
  }>(() => ({
    key: undefined,
    options: (request && optionCache.get(request)?.get(key)) || [],
  }));

  useEffect(() => {
    if (!request) return;
    const store = optionCache.get(request) ?? new Map();
    optionCache.set(request, store);
    const cached = store.get(key);
    if (cached) {
      setState({ key, options: cached });
      return;
    }
    let active = true;
    // A short wait so typing into a dependency sends one request.
    const timer = setTimeout(() => {
      request(form.api.state.values)
        .then((options) => {
          store.set(key, options);
          if (store.size > OPTION_CACHE_SIZE)
            store.delete(store.keys().next().value as string);
          if (active) setState({ key, options });
        })
        .catch(() => {
          if (active) setState({ key, options: [] });
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, key, form]);

  return {
    options: state.options,
    loading: Boolean(request) && state.key !== key,
  };
}

export interface FieldRuntime {
  readonly field: AnyFieldApi;
  readonly state: DataFormFieldState;
  readonly type: ValueTypeDefinition;
  readonly values: DataFormValues;
  readonly options: readonly DataFormOption[];
  readonly optionsLoading: boolean;
  readonly shown: boolean;
  readonly errors: readonly string[];
  readonly ids: ReturnType<typeof fieldIds>;
  readonly onChange: (value: unknown) => void;
  /** What the field's control receives; callers override what differs. */
  readonly editProps: ValueControlProps;
  /** What the field's read-only view receives. */
  readonly readProps: ValueReadProps;
}

/**
 * Binds one field to the form: subscribes to what it reads, applies
 * reactions and permissions, runs validators and registers the field.
 */
export function useFieldRuntime(config: DataFormFieldConfig): FieldRuntime {
  const form = useDataFormContext();
  const { size } = useDataFormLayout();
  const { api, labels } = form;
  const latest = useLatest(config);
  const dependencies = useStableNames(fieldDependencies(config));
  const watched = useWatched(form, dependencies);
  const type = getValueType(form.valueTypes, config.valueType);
  // Plugins such as steps decide this; only a change of the answer renders.
  const isShown = () =>
    form.plugins.every(
      (plugin) => plugin.isFieldShown?.(latest.current, form) ?? true,
    );
  const shown = useSyncExternalStore(
    form.pluginStore.subscribe,
    isShown,
    isShown,
  );

  const resolve = (values: DataFormValues) =>
    resolveFieldState(latest.current, values, {
      readonly: form.readonly,
      access: form.access,
    });
  const values = api.state.values;
  const state = resolve(values);

  const validate = (phase: "onBlur" | "onSubmit" | "onChange") => {
    return ({ value }: { value: unknown }) => {
      const current = api.state.values;
      const now = resolve(current);
      if (now.hidden || now.readonly) return undefined;
      if (phase !== "onChange" && now.required && isMissing(value))
        return labels.required;
      const validator: DataFormValidator | undefined =
        latest.current.validators?.[phase];
      return runValidatorSync(validator, value, current);
    };
  };
  const validateAsync = (phase: "onBlurAsync" | "onChangeAsync") => {
    return async ({ value }: { value: unknown }) => {
      const current = api.state.values;
      if (resolve(current).hidden) return undefined;
      const validator = latest.current.validators?.[phase];
      if (!validator) return undefined;
      return (await validator({ value, values: current })) || undefined;
    };
  };

  // `useField` renders this component when the value or its errors change.
  const field = useField({
    form: api,
    name: config.name,
    defaultValue: config.initialValue,
    validators: {
      onBlur: validate("onBlur"),
      onSubmit: validate("onSubmit"),
      onChange: config.validators?.onChange ? validate("onChange") : undefined,
      onChangeAsync: config.validators?.onChangeAsync
        ? validateAsync("onChangeAsync")
        : undefined,
      onChangeAsyncDebounceMs: config.validators?.debounceMs ?? 400,
      onBlurAsync: config.validators?.onBlurAsync
        ? validateAsync("onBlurAsync")
        : undefined,
    },
  } as never) as unknown as AnyFieldApi;
  const errors = state.hidden
    ? []
    : (field.state.meta.errors ?? []).flatMap(
        (error: unknown) => errorText(error) ?? [],
      );

  // `clearOnChange`: edits to these fields empty this one.
  const clearOn = useStableNames(clearTriggers(config));

  // `isHidden` and `transform` read the latest config through a ref.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above.
  useEffect(() => {
    const entry = {
      name: config.name,
      label: config.label,
      step: config.step,
      dateMode: type.dateMode,
      persist: type.persist,
      clearOn: clearOn.length ? clearOn : undefined,
      isHidden: (current: DataFormValues) =>
        isFieldHidden(latest.current, current, {
          readonly: form.readonly,
          access: form.access,
        }),
      transform: config.transform
        ? (value: unknown, all: DataFormValues) =>
            latest.current.transform?.(value, all)
        : undefined,
    };
    form.registry.set(config.name, entry);
    return () => {
      if (form.registry.get(config.name) === entry)
        form.registry.delete(config.name);
    };
  }, [
    form,
    config.name,
    config.label,
    config.step,
    config.transform,
    type,
    clearOn,
  ]);

  // Reactions that set a value write it when their branch switches.
  const branches = (config.reactions ?? [])
    .map((reaction) => (evaluateCondition(reaction.when, values) ? 1 : 0))
    .join("");
  const previousBranches = useRef(branches);
  useEffect(() => {
    if (previousBranches.current === branches) return;
    previousBranches.current = branches;
    const result = reactionValue(latest.current, api.state.values);
    if (result) api.setFieldValue(config.name, result.value);
  }, [api, branches, config.name, latest]);

  const requested = useRequestedOptions(config, form, watched);
  const options = config.request ? requested.options : (state.options ?? []);

  const onChange = (value: unknown) => {
    const changed = !Object.is(field.state.value, value);
    field.handleChange(value);
    if (changed) clearDependents(form, config.name);
    // A server error describes the old value; editing clears it.
    if (field.state.meta.errorMap?.onServer)
      field.setMeta((meta) => ({
        ...meta,
        errorMap: { ...meta.errorMap, onServer: undefined },
      }));
  };

  const ids = fieldIds(form, config.name);
  const describedBy =
    [
      config.description ? ids.description : undefined,
      errors.length ? ids.error : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return {
    field,
    state,
    type,
    values,
    options,
    optionsLoading: requested.loading,
    shown,
    errors,
    ids,
    onChange,
    editProps: {
      id: ids.control,
      name: config.name,
      value: field.state.value,
      values,
      onChange,
      onBlur: field.handleBlur,
      disabled: state.disabled || state.readonly || form.loading,
      invalid: errors.length > 0,
      required: state.required,
      label: nodeText(config.label ?? config.name),
      labelledBy: ids.label,
      describedBy,
      placeholder: config.placeholder,
      options,
      optionsLoading: requested.loading,
      fieldProps: editFieldProps(state.fieldProps),
      labels,
      size,
    },
    readProps: {
      value: field.state.value,
      options,
      fieldProps: state.fieldProps,
      labels,
    },
  };
}
