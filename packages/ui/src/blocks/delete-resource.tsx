"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import { Input } from "@workspace/ui/components/input";
import { Loader } from "@workspace/ui/components/loader";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export interface DeleteResourceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: string;
  resourceName: string;
  onDelete: () => void | Promise<void>;
  isDeleting?: boolean;
  caseSensitive?: boolean;
  errorMessage?: string;
  description?: ReactNode;
  className?: string;
  labels?: Partial<{
    title: string;
    description: string;
    confirmation: string;
    hint: string;
    cancel: string;
    delete: string;
    deleting: string;
    failed: string;
    copy: string;
    copying: string;
    copied: string;
    copyFailed: string;
  }>;
}

/** Requires an exact resource name and stays open if the delete callback fails. */
export function DeleteResource(props: DeleteResourceProps) {
  // Each opening and resource gets a fresh confirmation and error state.
  return (
    <DeleteResourceDialog
      key={`${props.resourceType}:${props.resourceName}:${props.open}`}
      {...props}
    />
  );
}

function DeleteResourceDialog({
  open,
  onOpenChange,
  resourceType,
  resourceName,
  onDelete,
  isDeleting = false,
  caseSensitive = true,
  errorMessage,
  description,
  className,
  labels: overrides,
}: DeleteResourceProps) {
  const id = useId();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const labels = {
    title: `Delete ${resourceType}?`,
    description: `This will permanently delete ${resourceName}. This action cannot be undone.`,
    confirmation: "Resource name",
    hint: `Type ${resourceName} to confirm.`,
    cancel: "Cancel",
    delete: `Delete ${resourceType}`,
    deleting: "Deleting…",
    failed: "Unable to delete this resource. Please try again.",
    copy: "Copy resource name",
    copying: "Copying…",
    copied: "Copied",
    copyFailed: "Copy failed. Select and copy the name manually.",
    ...overrides,
  };
  const busy = pending || isDeleting;
  const matches =
    resourceName.length > 0 &&
    (caseSensitive
      ? confirmation === resourceName
      : confirmation.toLocaleLowerCase() === resourceName.toLocaleLowerCase());
  const failure = errorMessage || error;
  let hintNameIndex = -1;
  if (resourceName) {
    hintNameIndex =
      overrides?.hint === undefined
        ? "Type ".length
        : labels.hint.indexOf(resourceName);
  }

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!matches || busy || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      await onDelete();
      if (mounted.current) onOpenChange(false);
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : labels.failed);
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? labels.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          onSubmit={handleDelete}
          className="flex flex-col gap-6"
          aria-busy={busy}
        >
          <FieldGroup>
            <Field data-invalid={!!failure} data-disabled={busy}>
              <FieldLabel htmlFor={id}>{labels.confirmation}</FieldLabel>
              <Input
                id={id}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={busy}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!failure}
                aria-describedby={`${id}-hint${failure ? ` ${id}-error` : ""}`}
              />
              <FieldDescription id={`${id}-hint`}>
                {resourceName ? (
                  <>
                    {hintNameIndex >= 0
                      ? labels.hint.slice(0, hintNameIndex)
                      : `${labels.hint} `}
                    <InlineCopyText
                      iconVisibility="always"
                      value={resourceName}
                      disabled={busy}
                      labels={{
                        copy: labels.copy,
                        pending: labels.copying,
                        copied: labels.copied,
                        failed: labels.copyFailed,
                      }}
                    >
                      {resourceName}
                    </InlineCopyText>
                    {hintNameIndex >= 0 &&
                      labels.hint.slice(hintNameIndex + resourceName.length)}
                  </>
                ) : (
                  labels.hint
                )}
              </FieldDescription>
              {failure && <FieldError id={`${id}-error`}>{failure}</FieldError>}
            </Field>
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={!matches || busy}
            >
              {busy && (
                <Loader data-icon="inline-start" label={labels.deleting} />
              )}
              {busy ? labels.deleting : labels.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
