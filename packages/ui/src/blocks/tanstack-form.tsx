"use client";

import { useForm } from "@tanstack/react-form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Loader } from "@workspace/ui/components/loader";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId, useState } from "react";
import { z } from "zod";

export interface BugReportValues {
  title: string;
  description: string;
}
export interface ProfileValues {
  name: string;
  email: string;
  role: string;
  notifications: boolean;
}
/** Text shared by form feedback and submission controls. */
export interface FormFeedbackLabels {
  failed: string;
  saved: string;
  savedDescription: string;
  submitError: string;
  submitting: string;
  reset: string;
}

const defaultFormFeedbackLabels: FormFeedbackLabels = {
  failed: "Submission failed",
  saved: "Saved",
  savedDescription: "Your changes have been submitted.",
  submitError: "Please try again.",
  submitting: "Submitting…",
  reset: "Reset",
};

export interface BugReportFormLabels extends FormFeedbackLabels {
  formTitle: string;
  formDescription: string;
  title: string;
  titlePlaceholder: string;
  description: string;
  descriptionHint: string;
  titleMinLength: string;
  titleMaxLength: string;
  descriptionMinLength: string;
  descriptionMaxLength: string;
  submit: string;
}

export const defaultBugReportFormLabels: BugReportFormLabels = {
  ...defaultFormFeedbackLabels,
  formTitle: "Bug report",
  formDescription: "Tell us what happened so we can improve the product.",
  title: "Title",
  titlePlaceholder: "Login button does not work on mobile",
  description: "Description",
  descriptionHint:
    "Include steps to reproduce, expected behavior, and actual results.",
  titleMinLength: "Title must be at least 5 characters.",
  titleMaxLength: "Title must be at most 80 characters.",
  descriptionMinLength: "Description must be at least 20 characters.",
  descriptionMaxLength: "Description must be at most 500 characters.",
  submit: "Submit report",
};

export interface ProfileFormLabels extends FormFeedbackLabels {
  formTitle: string;
  formDescription: string;
  name: string;
  email: string;
  role: string;
  rolePlaceholder: string;
  designerRole: string;
  developerRole: string;
  managerRole: string;
  notifications: string;
  nameMinLength: string;
  nameMaxLength: string;
  invalidEmail: string;
  invalidRole: string;
  submit: string;
}

export const defaultProfileFormLabels: ProfileFormLabels = {
  ...defaultFormFeedbackLabels,
  formTitle: "Profile settings",
  formDescription: "Update your details and notification preferences.",
  name: "Name",
  email: "Email",
  role: "Role",
  rolePlaceholder: "Choose a role",
  designerRole: "Designer",
  developerRole: "Developer",
  managerRole: "Manager",
  notifications: "Email me product updates",
  nameMinLength: "Name must be at least 2 characters.",
  nameMaxLength: "Name must be at most 50 characters.",
  invalidEmail: "Enter a valid email address.",
  invalidRole: "Choose a role.",
  submit: "Save profile",
};

export interface FormBlockProps<T, TLabels = FormFeedbackLabels> {
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void | Promise<void>;
  labels?: Partial<TLabels>;
  className?: string;
}

function useSubmission<T>(
  onSubmit: FormBlockProps<T>["onSubmit"],
  fallback: string,
) {
  const [feedback, setFeedback] = useState<{ error?: string; saved?: boolean }>(
    {},
  );
  async function submit(values: T) {
    setFeedback({});
    try {
      await onSubmit(values);
      setFeedback({ saved: true });
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : fallback });
    }
  }
  return { feedback, submit, reset: () => setFeedback({}) };
}

function FormFeedback({
  feedback,
  labels,
}: {
  feedback: { error?: string; saved?: boolean };
  labels: FormFeedbackLabels;
}) {
  if (!feedback.error && !feedback.saved) return null;
  return (
    <Alert
      variant={feedback.error ? "destructive" : "default"}
      role={feedback.error ? "alert" : "status"}
    >
      <AlertTitle>{feedback.error ? labels.failed : labels.saved}</AlertTitle>
      <AlertDescription>
        {feedback.error ?? labels.savedDescription}
      </AlertDescription>
    </Alert>
  );
}

/** A validated report form with asynchronous submission and reset controls. */
export function BugReportForm({
  initialValues,
  onSubmit,
  labels: overrides,
  className,
}: FormBlockProps<BugReportValues, BugReportFormLabels>) {
  const labels = { ...defaultBugReportFormLabels, ...overrides };
  const id = useId();
  const schema = z.object({
    title: z
      .string()
      .trim()
      .min(5, labels.titleMinLength)
      .max(80, labels.titleMaxLength),
    description: z
      .string()
      .trim()
      .min(20, labels.descriptionMinLength)
      .max(500, labels.descriptionMaxLength),
  });
  const submission = useSubmission(onSubmit, labels.submitError);
  const form = useForm({
    defaultValues: { title: "", description: "", ...initialValues },
    validators: { onBlur: schema, onSubmit: schema },
    onSubmit: async ({ value }) => submission.submit(schema.parse(value)),
  });
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{labels.formTitle}</CardTitle>
        <CardDescription>{labels.formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id={id}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <FieldGroup>
                <form.Field name="title">
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid} data-disabled={pending}>
                        <FieldLabel htmlFor={`${id}-title`}>
                          {labels.title}
                        </FieldLabel>
                        <Input
                          id={`${id}-title`}
                          name={field.name}
                          value={field.state.value}
                          disabled={pending}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          aria-invalid={invalid}
                          aria-describedby={
                            invalid ? `${id}-title-error` : undefined
                          }
                          placeholder={labels.titlePlaceholder}
                          autoComplete="off"
                        />
                        {invalid && (
                          <FieldError
                            id={`${id}-title-error`}
                            errors={field.state.meta.errors}
                          />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
                <form.Field name="description">
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid} data-disabled={pending}>
                        <FieldLabel htmlFor={`${id}-description`}>
                          {labels.description}
                        </FieldLabel>
                        <Textarea
                          id={`${id}-description`}
                          name={field.name}
                          value={field.state.value}
                          rows={5}
                          disabled={pending}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          aria-invalid={invalid}
                          aria-describedby={`${id}-description-hint${invalid ? ` ${id}-description-error` : ""}`}
                        />
                        <FieldDescription id={`${id}-description-hint`}>
                          {labels.descriptionHint}
                        </FieldDescription>
                        {invalid && (
                          <FieldError
                            id={`${id}-description-error`}
                            errors={field.state.meta.errors}
                          />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
                <FormFeedback feedback={submission.feedback} labels={labels} />
              </FieldGroup>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
      <CardFooter>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, pending]) => (
            <Field orientation="horizontal">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  form.reset();
                  submission.reset();
                }}
              >
                {labels.reset}
              </Button>
              <Button type="submit" form={id} disabled={!canSubmit || pending}>
                {pending && <Loader size="sm" label={labels.submitting} />}
                {labels.submit}
              </Button>
            </Field>
          )}
        </form.Subscribe>
      </CardFooter>
    </Card>
  );
}

/** Combines text, email, select, and checkbox fields using TanStack Form. */
export function ProfileForm({
  initialValues,
  onSubmit,
  labels: overrides,
  className,
}: FormBlockProps<ProfileValues, ProfileFormLabels>) {
  const labels = { ...defaultProfileFormLabels, ...overrides };
  const id = useId();
  const roles = [
    { value: "designer", label: labels.designerRole },
    { value: "developer", label: labels.developerRole },
    { value: "manager", label: labels.managerRole },
  ];
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, labels.nameMinLength)
      .max(50, labels.nameMaxLength),
    email: z.email(labels.invalidEmail),
    role: z.enum(["designer", "developer", "manager"], {
      error: labels.invalidRole,
    }),
    notifications: z.boolean(),
  });
  const submission = useSubmission(onSubmit, labels.submitError);
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      role: "",
      notifications: true,
      ...initialValues,
    },
    validators: { onBlur: schema, onSubmit: schema },
    onSubmit: async ({ value }) => submission.submit(schema.parse(value)),
  });
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{labels.formTitle}</CardTitle>
        <CardDescription>{labels.formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id={id}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <FieldGroup>
                {(["name", "email"] as const).map((name) => (
                  <form.Field key={name} name={name}>
                    {(field) => {
                      const invalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={invalid} data-disabled={pending}>
                          <FieldLabel htmlFor={`${id}-${name}`}>
                            {labels[name]}
                          </FieldLabel>
                          <Input
                            id={`${id}-${name}`}
                            name={field.name}
                            type={name === "email" ? "email" : "text"}
                            autoComplete={name}
                            value={field.state.value}
                            disabled={pending}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            aria-invalid={invalid}
                            aria-describedby={
                              invalid ? `${id}-${name}-error` : undefined
                            }
                          />
                          {invalid && (
                            <FieldError
                              id={`${id}-${name}-error`}
                              errors={field.state.meta.errors}
                            />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                ))}
                <form.Field name="role">
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid} data-disabled={pending}>
                        <FieldLabel htmlFor={`${id}-role`}>
                          {labels.role}
                        </FieldLabel>
                        <Select
                          items={roles}
                          name={field.name}
                          value={field.state.value || null}
                          disabled={pending}
                          onValueChange={(value) =>
                            field.handleChange(value ?? "")
                          }
                        >
                          <SelectTrigger
                            id={`${id}-role`}
                            onBlur={field.handleBlur}
                            aria-invalid={invalid}
                            aria-describedby={
                              invalid ? `${id}-role-error` : undefined
                            }
                          >
                            <SelectValue placeholder={labels.rolePlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {roles.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {invalid && (
                          <FieldError
                            id={`${id}-role-error`}
                            errors={field.state.meta.errors}
                          />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
                <form.Field name="notifications">
                  {(field) => (
                    <Field orientation="horizontal" data-disabled={pending}>
                      <Checkbox
                        id={`${id}-notifications`}
                        name={field.name}
                        checked={field.state.value}
                        disabled={pending}
                        onBlur={field.handleBlur}
                        onCheckedChange={field.handleChange}
                      />
                      <FieldLabel htmlFor={`${id}-notifications`}>
                        {labels.notifications}
                      </FieldLabel>
                    </Field>
                  )}
                </form.Field>
                <FormFeedback feedback={submission.feedback} labels={labels} />
              </FieldGroup>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
      <CardFooter>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, pending]) => (
            <Field orientation="horizontal">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  form.reset();
                  submission.reset();
                }}
              >
                {labels.reset}
              </Button>
              <Button type="submit" form={id} disabled={!canSubmit || pending}>
                {pending && <Loader size="sm" label={labels.submitting} />}
                {labels.submit}
              </Button>
            </Field>
          )}
        </form.Subscribe>
      </CardFooter>
    </Card>
  );
}
