"use client";

import { type ReactNode, type Ref, useImperativeHandle } from "react";
import type { DataFormLayout } from "@/components/ui/data-form/context";
import { DataFormFields } from "@/components/ui/data-form/fields";
import {
  DataFormActions,
  type DataFormCollapse,
  DataFormErrorSummary,
  DataFormRoot,
} from "@/components/ui/data-form/parts";
import type {
  DataFormActions as Actions,
  DataFormInstance,
  DataFormValues,
} from "@/components/ui/data-form/types";
import { type UseDataFormOptions, useDataForm } from "@/components/ui/data-form/use-data-form";

interface DataFormFrameProps {
  readonly layout?: DataFormLayout;
  /** Grid columns on wide containers, for `layout="grid"`. */
  readonly columns?: 1 | 2 | 3 | 4;
  readonly collapse?: boolean | DataFormCollapse;
  /** `false` hides the buttons; a node replaces them. */
  readonly submitter?: false | ReactNode;
  /** Keeps the buttons in view at the bottom of a long form on a page. */
  readonly stickyFooter?: boolean;
  readonly className?: string;
  /** Rendered after `fields`, so both can be mixed. */
  readonly children?: ReactNode;
  readonly actionRef?: Ref<Actions>;
}

export type DataFormProps<TValues extends DataFormValues = DataFormValues> =
  DataFormFrameProps &
    (
      | (UseDataFormOptions<TValues> & { readonly form?: undefined })
      | {
          /** A form from `useDataForm`, for state you read outside. */
          readonly form: DataFormInstance<TValues>;
        }
    );

function DataFormFrame({
  form,
  layout,
  columns,
  collapse,
  submitter,
  stickyFooter,
  className,
  children,
  actionRef,
}: DataFormFrameProps & { form: DataFormInstance }) {
  useImperativeHandle(actionRef, () => form, [form]);
  const content = (
    <DataFormRoot
      form={form}
      layout={layout}
      columns={columns}
      collapse={collapse}
      className={className}
    >
      <DataFormErrorSummary />
      <DataFormFields />
      {children}
      <DataFormActions submitter={submitter} sticky={stickyFooter} />
    </DataFormRoot>
  );
  // The first plugin wraps the outside, so `[sheet(), steps()]` reads in order.
  return form.plugins.reduceRight<ReactNode>(
    (node, plugin) => (plugin.wrapForm ? plugin.wrapForm(node, form) : node),
    content,
  );
}

function DataFormWithOptions<TValues extends DataFormValues>({
  layout,
  columns,
  collapse,
  submitter,
  stickyFooter,
  className,
  children,
  actionRef,
  ...options
}: DataFormFrameProps & UseDataFormOptions<TValues>) {
  const form = useDataForm<TValues>(options);
  return (
    <DataFormFrame
      form={form as unknown as DataFormInstance}
      {...{
        layout,
        columns,
        collapse,
        submitter,
        stickyFooter,
        className,
        children,
        actionRef,
      }}
    />
  );
}

/**
 * A form from `fields`, `children` or both, with Reset and Submit. It is the
 * default arrangement of `DataFormRoot`, `DataFormFields` and
 * `DataFormActions`; compose those directly for a different one.
 */
export function DataForm<TValues extends DataFormValues = DataFormValues>(
  props: DataFormProps<TValues>,
) {
  if (props.form) {
    const { form, ...frame } = props;
    return (
      <DataFormFrame form={form as unknown as DataFormInstance} {...frame} />
    );
  }
  return <DataFormWithOptions<TValues> {...props} />;
}
