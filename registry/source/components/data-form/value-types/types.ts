import type { ReactNode } from "react";
import type { DataFormLabels } from "@/components/ui/data-form/labels";
import type { DataFormLightMode } from "@/components/ui/data-form/types";

export type DataFormOptionColor =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export interface DataFormOption {
  readonly value: string;
  readonly label: ReactNode;
  /** Badge tone when the value is shown read-only. */
  readonly color?: DataFormOptionColor;
  readonly disabled?: boolean;
}

/**
 * Options and how they read: `{ open: { text: "Open", color: "default" } }`,
 * `{ open: "Open" }`, or a list of options.
 */
export type ValueEnum =
  | readonly DataFormOption[]
  | Readonly<
      Record<
        string,
        | ReactNode
        | {
            readonly text: ReactNode;
            readonly color?: DataFormOptionColor;
            readonly disabled?: boolean;
          }
      >
    >;

/** What an editing control receives. */
export interface ValueEditProps {
  readonly id: string;
  readonly name: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly onBlur: () => void;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly required: boolean;
  /** Plain text of the label, for controls made of several inputs. */
  readonly label: string;
  /** Points at the visible label, for controls a `for` cannot name. */
  readonly labelledBy: string;
  readonly describedBy: string | undefined;
  readonly placeholder: string | undefined;
  readonly options: readonly DataFormOption[];
  readonly optionsLoading: boolean;
  readonly fieldProps: Readonly<Record<string, unknown>>;
  readonly labels: DataFormLabels;
  /**
   * The label shown inside the control, before the value, as light filter
   * rows do. The control still names itself through `label`.
   */
  readonly prefix?: ReactNode;
  /** `sm` in compact rows such as a table toolbar: 32px controls. */
  readonly size?: "sm" | "default";
}

/** What a read-only view receives. Keep it pure: tables call it per cell. */
export interface ValueReadProps {
  readonly value: unknown;
  readonly options: readonly DataFormOption[];
  readonly fieldProps: Readonly<Record<string, unknown>>;
  readonly labels: DataFormLabels;
}

export interface ValueTypeDefinition {
  readonly edit: (props: ValueEditProps) => ReactNode;
  /** Read-only view; defaults to `text`. */
  readonly read?: (props: ValueReadProps) => ReactNode;
  /** Plain text, for summaries, chips and exports. */
  readonly text?: (props: ValueReadProps) => string;
  /**
   * Places the control beside its label instead of below it: `start` puts a
   * checkbox before the label, `end` puts a switch after it.
   */
  readonly inline?: "start" | "end";
  /**
   * `group` controls are made of several inputs, so the label names them
   * through `aria-labelledby` instead of `for`.
   */
  readonly labelTarget?: "control" | "group";
  /**
   * Where the control sits in a light row unless a field says otherwise:
   * `inline` for compact triggers such as date pickers. Defaults to
   * `popover`.
   */
  readonly lightMode?: DataFormLightMode;
  /** Dates are submitted as days (`date`) or with their time (`dateTime`). */
  readonly dateMode?: "date" | "dateTime";
  /** `false` keeps values of this type, such as passwords, out of drafts. */
  readonly persist?: boolean;
  /** Draws `prefix` inside the control, so a light row needs no outer label. */
  readonly prefix?: boolean;
  /** The control has its own clear action, so a light popover adds none. */
  readonly clears?: boolean;
}

export type ValueTypeMap = Readonly<Record<string, ValueTypeDefinition>>;
