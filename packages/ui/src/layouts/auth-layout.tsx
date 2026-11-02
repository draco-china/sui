import { cn } from "cn";
import type * as React from "react";

type AuthLayoutProps = React.ComponentProps<"div"> & {
  /** `split` adds a second column for an AuthLayoutAside from `lg` up. */
  variant?: "centered" | "split";
};

/** Frame for sign-in, sign-up and recovery pages. */
function AuthLayout({
  variant = "centered",
  className,
  ...props
}: AuthLayoutProps) {
  return (
    <div
      data-slot="auth-layout"
      data-variant={variant}
      className={cn(
        "grid min-h-svh",
        variant === "split" && "lg:grid-cols-2",
        className,
      )}
      {...props}
    />
  );
}

/** Centered column holding the brand and the form. */
function AuthLayoutContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="auth-layout-content"
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col justify-center gap-6 self-center px-4 py-8",
        className,
      )}
      {...props}
    />
  );
}

/** Logo and product name above the form. */
function AuthLayoutBrand({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="auth-layout-brand"
      className={cn(
        "flex items-center justify-center gap-2 font-medium text-xl",
        className,
      )}
      {...props}
    />
  );
}

/** Panel beside the form in the split variant, such as artwork or a quote. Hidden below `lg`. */
function AuthLayoutAside({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="auth-layout-aside"
      className={cn(
        "relative hidden overflow-hidden bg-muted lg:block",
        className,
      )}
      {...props}
    />
  );
}

export {
  AuthLayout,
  AuthLayoutAside,
  AuthLayoutBrand,
  AuthLayoutContent,
  type AuthLayoutProps,
};
