"use client";

import {
  revalidateLogic,
  type StandardSchemaV1,
  useForm,
} from "@tanstack/react-form";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPluginStore } from "./context";
import { focusFirstError } from "./dom";
import {
  convertValues,
  errorText,
  hiddenNames,
  invalidNames,
  isHiddenPath,
  isStandardSchema,
  issuesToErrors,
  prepareValues,
  readServerErrors,
} from "./engine";
import { type DataFormLabelOverrides, resolveDataFormLabels } from "./labels";
import type {
  DataFormAccessMap,
  DataFormApi,
  DataFormDateFormatter,
  DataFormFieldConfig,
  DataFormFieldEntry,
  DataFormInstance,
  DataFormPlugin,
  DataFormServerErrors,
  DataFormValues,
} from "./types";
import { useValueTypes, type ValueTypeMap } from "./value-types";

/** Anything; a `{ fields, form }` result is shown as server errors. */
type FinishResult = unknown;

type FormValidatorResult =
  | DataFormServerErrors
  | string
  | undefined
  | null
  | Promise<DataFormServerErrors | string | undefined | null>;

export interface UseDataFormOptions<
  TValues extends DataFormValues = DataFormValues,
> {
  readonly fields?: readonly DataFormFieldConfig<TValues>[];
  readonly defaultValues?: Partial<TValues>;
  /** Loads the initial values, such as the record an edit form opens. */
  readonly request?: () => Promise<Partial<TValues>>;
  /**
   * Validates the whole form on submit, then on blur. Takes a Standard
   * Schema such as Zod directly. Hidden fields are never reported.
   */
  readonly validator?:
    | StandardSchemaV1
    | ((values: TValues) => FormValidatorResult);
  /**
   * Receives the submission payload. Return or throw `{ fields, form }` to
   * show server errors under their fields.
   */
  readonly onFinish?: (values: TValues) => FinishResult;
  readonly onFinishFailed?: (error: unknown) => void;
  readonly onReset?: () => void;
  readonly onValuesChange?: (values: TValues) => void;
  readonly readonly?: boolean;
  readonly access?: DataFormAccessMap;
  readonly plugins?: readonly DataFormPlugin[];
  readonly labels?: DataFormLabelOverrides;
  readonly valueTypes?: ValueTypeMap;
  /** `change` submits after each change, for filters. */
  readonly submitOn?: "submit" | "change";
  /** Reads stored values into the shape the controls use. */
  readonly convertValue?: (values: DataFormValues) => DataFormValues;
  /** Writes the payload after field transforms. */
  readonly transform?: (values: DataFormValues) => DataFormValues;
  /** How dates are submitted; `string` writes local `yyyy-mm-dd`. */
  readonly dateFormatter?: DataFormDateFormatter;
  /** Leaves out `null` and `undefined` values on submit. */
  readonly omitNil?: boolean;
}

const NO_PLUGINS: readonly DataFormPlugin[] = [];

/**
 * The same access map for as long as it says the same, so an inline
 * `access={{ ... }}` doesn't rebuild every field each render. A function is
 * kept by identity; memoize it.
 */
export function useStableAccess(access: DataFormAccessMap | undefined) {
  const key = typeof access === "object" ? JSON.stringify(access) : access;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `access`.
  return useMemo(() => access, [key]);
}

export function useDataForm<TValues extends DataFormValues = DataFormValues>(
  options: UseDataFormOptions<TValues> = {},
): DataFormInstance<TValues> {
  const id = useId();
  const latest = useRef(options);
  latest.current = options;
  const labels = useMemo(
    () => resolveDataFormLabels(options.labels),
    [options.labels],
  );
  const valueTypes = useValueTypes(options.valueTypes);
  const [registry] = useState(() => new Map<string, DataFormFieldEntry>());
  const [pluginStore] = useState(createPluginStore);
  const [formError, setFormError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(options.request));
  const access = useStableAccess(options.access);
  const instance = useRef<DataFormInstance>(null);

  const convert = (values: DataFormValues) => {
    const converted = convertValues(
      values,
      (latest.current.fields ?? []) as readonly DataFormFieldConfig[],
    );
    return latest.current.convertValue?.(converted) ?? converted;
  };
  const [initialValues] = useState(() =>
    convert((options.defaultValues ?? {}) as DataFormValues),
  );
  // TanStack puts `defaultValues` back on every render until a field is
  // touched, so they follow each reset, or the next render would undo it.
  const defaults = useRef(initialValues);

  const hidden = (values: DataFormValues) =>
    hiddenNames(registry.values(), values);

  const getSubmitValues = (values: DataFormValues) =>
    prepareValues(values, {
      hidden: hidden(values),
      entries: registry.values(),
      dateFormatter: latest.current.dateFormatter,
      omitNil: latest.current.omitNil,
      transform: latest.current.transform,
    }) as TValues;

  const focusErrors = () => focusFirstError({ id });

  const applyErrors = (api: DataFormApi, errors: DataFormServerErrors) => {
    const parsed = readServerErrors(errors);
    if (!parsed) return;
    setFormError(parsed.form);
    for (const [name, message] of Object.entries(parsed.fields))
      api.setFieldMeta(name, (meta) => ({
        ...meta,
        isTouched: true,
        errorMap: { ...meta?.errorMap, onServer: message },
      }));
  };

  const validateForm = async (values: DataFormValues) => {
    const validator = latest.current.validator;
    if (!validator) return undefined;
    const skip = hidden(values);
    if (isStandardSchema(validator)) {
      const result = await validator["~standard"].validate(values);
      if (!result.issues) return undefined;
      const errors = issuesToErrors(result.issues, skip);
      if (!errors.form && Object.keys(errors.fields).length === 0)
        return undefined;
      return errors;
    }
    const result = await validator(values as TValues);
    if (!result) return undefined;
    if (typeof result === "string") return { form: result, fields: {} };
    const parsed = readServerErrors(result);
    if (!parsed) return undefined;
    const fields = Object.fromEntries(
      Object.entries(parsed.fields).filter(
        ([name]) => !isHiddenPath(name, skip),
      ),
    );
    return { form: parsed.form, fields };
  };

  const api = useForm({
    defaultValues: defaults.current,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "blur",
    }),
    validators: {
      onDynamicAsync: ({ value }: { value: DataFormValues }) =>
        validateForm(value),
    },
    onSubmit: async ({ value }) => {
      setFormError(undefined);
      const current = instance.current;
      try {
        const result = await latest.current.onFinish?.(getSubmitValues(value));
        if (result && readServerErrors(result)) {
          applyErrors(api, result);
          focusErrors();
          return;
        }
        if (current)
          for (const plugin of current.plugins) plugin.onFinished?.(current);
      } catch (error) {
        const errors = readServerErrors(error);
        if (errors) applyErrors(api, error as DataFormServerErrors);
        else setFormError(errorText(error) ?? labels.submitFailed);
        focusErrors();
        latest.current.onFinishFailed?.(error);
      }
    },
    onSubmitInvalid: ({ formApi }) => {
      const names = invalidNames(formApi.state);
      const current = instance.current;
      if (current)
        for (const plugin of current.plugins)
          plugin.onSubmitInvalid?.(current, names);
      focusErrors();
      latest.current.onFinishFailed?.(formApi.state.errors);
    },
  }) as unknown as DataFormApi;

  /** Resets to `values`, which become the values Reset returns to. */
  const resetTo = (values?: DataFormValues) => {
    if (values) defaults.current = values;
    api.reset(values);
  };

  // Loads once, like `defaultValues`; remount the form to load again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above.
  useEffect(() => {
    const request = latest.current.request;
    if (!request) return;
    let active = true;
    request()
      .then((values) => {
        if (active) resetTo(convert(values as DataFormValues));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    if (!latest.current.onValuesChange) return;
    // The store also changes for focus, validation and submitting.
    let last = api.state.values;
    const subscription = api.store.subscribe(() => {
      const values = api.state.values;
      if (values === last) return;
      last = values;
      latest.current.onValuesChange?.(values as TValues);
    });
    return () => subscription.unsubscribe();
  }, [api]);

  const fieldsHaveErrors = (names: readonly string[]) =>
    names.some((name) => {
      const meta = api.getFieldMeta(name);
      return Boolean(meta?.errors?.length);
    });

  const plugins = options.plugins ?? NO_PLUGINS;
  // Methods read `latest`, so only what renders is a dependency.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above.
  const value = useMemo<DataFormInstance<TValues>>(
    () => ({
      api,
      id,
      labels,
      valueTypes,
      readonly: Boolean(options.readonly),
      access,
      plugins,
      fields: options.fields ?? [],
      registry,
      pluginStore,
      loading,
      formError,
      submitOn: options.submitOn ?? "submit",
      getSubmitValues: () => getSubmitValues(api.state.values),
      submit: async () => {
        const current = instance.current;
        if (current)
          for (const plugin of current.plugins)
            if ((await plugin.beforeSubmit?.(current)) === false) return;
        await api.handleSubmit();
      },
      reset: (values) => {
        setFormError(undefined);
        resetTo(values ? convert(values) : undefined);
        const current = instance.current;
        if (current)
          for (const plugin of current.plugins) plugin.onReset?.(current);
        latest.current.onReset?.();
      },
      validate: async () => {
        await api.validateAllFields("submit");
        // The form's own `validator` too, such as a schema, as submit runs it.
        await api.validate("submit");
        const skip = hidden(api.state.values);
        const names = [...registry.keys()].filter(
          (name) => !skip.includes(name),
        );
        return !fieldsHaveErrors(names) && api.state.errors.length === 0;
      },
      validateFields: async (names) => {
        await Promise.all(
          names.map((name) => api.validateField(name, "submit")),
        );
        return !fieldsHaveErrors(names);
      },
      setValues: (values) => {
        for (const [name, next] of Object.entries(values))
          api.setFieldValue(name, next);
      },
      setErrors: (errors) => applyErrors(api, errors),
    }),
    [
      api,
      id,
      labels,
      valueTypes,
      options.readonly,
      access,
      plugins,
      options.fields,
      registry,
      pluginStore,
      loading,
      formError,
      options.submitOn,
    ],
  );
  instance.current = value as unknown as DataFormInstance;
  return value;
}
