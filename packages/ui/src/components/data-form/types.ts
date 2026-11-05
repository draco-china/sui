import type {
  ReactFormExtendedApi,
  StandardSchemaV1,
} from "@tanstack/react-form";
import type { ReactNode } from "react";
import type { FilterGroup } from "./conditions";
import type { DataFormLabels } from "./labels";
import type { DataFormOption, ValueEnum, ValueTypeMap } from "./value-types";

export type DataFormValues = Record<string, unknown>;

/** A static value, or one computed from the current form values. */
export type DataFormDynamic<T, TValues = DataFormValues> =
  | T
  | ((values: TValues) => T);

export type DataFormAccess = "edit" | "readonly" | "hidden";

/**
 * Where a field sits in `layout="light"`: `inline` puts its control on the
 * row, `popover` a compact button that opens it, `more` the Filters panel.
 */
export type DataFormLightMode = "inline" | "popover" | "more";

/** Per-field permissions; they win over every other rule. */
export type DataFormAccessMap =
  | Readonly<Record<string, DataFormAccess>>
  | ((name: string) => DataFormAccess | undefined);

/** What a reaction may set on its field. */
export interface DataFormReactionState {
  readonly hidden?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  /** Written to the field when the reaction switches to this branch. */
  readonly value?: unknown;
  readonly fieldProps?: Readonly<Record<string, unknown>>;
  readonly options?: readonly DataFormOption[];
}

/**
 * A linkage rule as plain JSON, so a server can send it. The condition uses
 * the DataTable filter operators, so no expression is ever evaluated.
 */
export interface DataFormReaction {
  readonly when: FilterGroup;
  readonly fulfill?: DataFormReactionState;
  readonly otherwise?: DataFormReactionState;
}

export type DataFormValidatorFn = (props: {
  readonly value: unknown;
  readonly values: DataFormValues;
}) => string | undefined | null | false;

export type DataFormAsyncValidatorFn = (props: {
  readonly value: unknown;
  readonly values: DataFormValues;
}) => Promise<string | undefined | null | false>;

export type DataFormValidator = DataFormValidatorFn | StandardSchemaV1;

/** Field validators. The patterns ask for blur and submit, not keystrokes. */
export interface DataFormFieldValidators {
  readonly onBlur?: DataFormValidator;
  readonly onSubmit?: DataFormValidator;
  readonly onChange?: DataFormValidator;
  readonly onBlurAsync?: DataFormAsyncValidatorFn;
  readonly onChangeAsync?: DataFormAsyncValidatorFn;
  /** Waits this long after typing stops before `onChangeAsync` runs. */
  readonly debounceMs?: number;
}

/** What a field's `render` receives to draw a custom control. */
export interface DataFormControlProps {
  readonly id: string;
  readonly name: string;
  readonly value: unknown;
  readonly values: DataFormValues;
  readonly onChange: (value: unknown) => void;
  readonly onBlur: () => void;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly required: boolean;
  readonly describedBy: string | undefined;
  readonly labelledBy: string;
  readonly fieldProps: Readonly<Record<string, unknown>>;
  readonly options: readonly DataFormOption[];
}

/** One field, in `fields` or as `<DataFormField>`. */
export interface DataFormFieldConfig<TValues = DataFormValues> {
  /** A dot or bracket path: `email`, `profile.city`, `items[0].name`. */
  readonly name: string;
  readonly label?: ReactNode;
  readonly description?: ReactNode;
  /** Extra help behind an info button next to the label. */
  readonly tooltip?: ReactNode;
  /** Shows the expected format; never the only label. */
  readonly placeholder?: string;
  /** A built-in type such as `select`, or one from `valueTypes`. */
  readonly valueType?: string;
  readonly valueEnum?: ValueEnum;
  readonly options?: DataFormDynamic<readonly DataFormOption[], TValues>;
  /** Loads options; runs again when a dependency changes. */
  readonly request?: (values: TValues) => Promise<readonly DataFormOption[]>;
  readonly fieldProps?: DataFormDynamic<
    Readonly<Record<string, unknown>>,
    TValues
  >;
  readonly hidden?: DataFormDynamic<boolean, TValues>;
  readonly required?: DataFormDynamic<boolean, TValues>;
  readonly disabled?: DataFormDynamic<boolean, TValues>;
  readonly readonly?: DataFormDynamic<boolean, TValues>;
  readonly reactions?: readonly DataFormReaction[];
  /**
   * Values this field reads. Reactions add theirs on their own; list them
   * for functions so only this field renders again when they change.
   */
  readonly dependencies?: readonly string[];
  /** Clears this field when a dependency (or the listed fields) changes. */
  readonly clearOnChange?: boolean | readonly string[];
  readonly initialValue?: unknown;
  readonly validators?: DataFormFieldValidators;
  /** Reads a stored value into the shape the control uses. */
  readonly convertValue?: (value: unknown) => unknown;
  /**
   * Writes the value for submission. Return an object to replace the field
   * with several keys, such as `{ startAt, endAt }`.
   */
  readonly transform?: (value: unknown, values: TValues) => unknown;
  /** Grid columns the field spans in `layout="grid"`. */
  readonly colSpan?: number;
  /** The step this field belongs to, with the `steps()` plugin. */
  readonly step?: string;
  /**
   * Where the field sits in `layout="light"`. Date and time pickers default
   * to `inline`, other controls to `popover`; fields past `collapse.count`
   * move to `more`.
   */
  readonly lightMode?: DataFormLightMode;
  readonly className?: string;
  /** A custom control instead of the value type's own. */
  readonly render?: (props: DataFormControlProps) => ReactNode;
}

/** A field's state after reactions, functions and permissions. */
export interface DataFormFieldState {
  readonly hidden: boolean;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly fieldProps: Readonly<Record<string, unknown>>;
  readonly options: readonly DataFormOption[] | undefined;
}

/** Errors a server returns, by field path, plus one for the whole form. */
export interface DataFormServerErrors {
  readonly fields?: Readonly<Record<string, string | readonly string[]>>;
  readonly form?: string;
}

export type DataFormDateFormatter = "string" | "number" | false;

/** What the registry keeps for each rendered field. */
export interface DataFormFieldEntry {
  readonly name: string;
  readonly label?: ReactNode;
  readonly step?: string;
  /** From the value type: how its dates are submitted. */
  readonly dateMode?: "date" | "dateTime";
  /** From the value type: `false` keeps it out of saved drafts. */
  readonly persist?: boolean;
  /** Fields whose edits empty this one, from `clearOnChange`. */
  readonly clearOn?: readonly string[];
  /** Whether the field is hidden for these values; hidden fields are not submitted. */
  readonly isHidden: (values: DataFormValues) => boolean;
  readonly transform?: (value: unknown, values: DataFormValues) => unknown;
}

export type DataFormSlot = "header" | "footer";

/**
 * Features beyond the core are plugins. `setup` runs as a hook in its own
 * component under the form's provider. Memoize the plugin list.
 */
export interface DataFormPlugin {
  readonly name: string;
  readonly setup?: (form: DataFormInstance) => void;
  /** Wraps the form, such as in a Dialog. */
  readonly wrapForm?: (
    children: ReactNode,
    form: DataFormInstance,
  ) => ReactNode;
  /** `footer` replaces the default buttons, as the steps' Previous and Next do. */
  readonly slots?: Partial<
    Record<DataFormSlot, (form: DataFormInstance) => ReactNode>
  >;
  /**
   * Gives the form a Cancel button, such as closing a dialog. Every footer
   * shows it, the default one and a plugin's alike.
   */
  readonly onCancel?: (form: DataFormInstance) => void;
  /** Plugin store keys a saved draft keeps, such as the current step. */
  readonly persistKeys?: readonly string[];
  /** Fields this returns false for stay mounted but out of view. */
  readonly isFieldShown?: (
    field: DataFormFieldConfig,
    form: DataFormInstance,
  ) => boolean;
  /** Return false to stop a submit, as the steps plugin does before the last step. */
  readonly beforeSubmit?: (
    form: DataFormInstance,
  ) => boolean | Promise<boolean>;
  readonly onSubmitInvalid?: (
    form: DataFormInstance,
    names: readonly string[],
  ) => void;
  /** After `onFinish` resolved without errors. */
  readonly onFinished?: (form: DataFormInstance) => void;
  readonly onReset?: (form: DataFormInstance) => void;
}

/** A tiny store plugins keep their state in, such as the current step. */
export interface DataFormPluginStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe(listener: () => void): () => void;
}

export interface DataFormActions {
  submit(): Promise<void>;
  /** Back to the initial values, or to `values`. */
  reset(values?: DataFormValues): void;
  /** Validates every field; resolves true when the form is valid. */
  validate(): Promise<boolean>;
  /** Validates only these fields, such as one step. */
  validateFields(names: readonly string[]): Promise<boolean>;
  setValues(values: DataFormValues): void;
  setErrors(errors: DataFormServerErrors): void;
}

// TanStack's form type takes a generic per validator; DataForm keeps them
// loose so its own API stays one generic deep.
// biome-ignore lint/suspicious/noExplicitAny: see above.
type Loose = any;

export type DataFormApi = ReactFormExtendedApi<
  DataFormValues,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose,
  Loose
>;

export interface DataFormInstance<TValues = DataFormValues>
  extends DataFormActions {
  /** The TanStack form: `api.Field`, `api.Subscribe`, `api.store`. */
  readonly api: DataFormApi;
  /** Prefix for element ids, from `useId`. */
  readonly id: string;
  readonly labels: DataFormLabels;
  readonly valueTypes: ValueTypeMap;
  readonly readonly: boolean;
  readonly access: DataFormAccessMap | undefined;
  readonly plugins: readonly DataFormPlugin[];
  readonly fields: readonly DataFormFieldConfig<TValues>[];
  readonly registry: Map<string, DataFormFieldEntry>;
  readonly pluginStore: DataFormPluginStore;
  /** True while `request` loads the initial values. */
  readonly loading: boolean;
  /** An error for the whole form, from the server or a thrown `onFinish`. */
  readonly formError: string | undefined;
  readonly submitOn: "submit" | "change";
  /** The submission payload for the current values. */
  getSubmitValues(): TValues;
}
