"use client";

import {
  AuthLayout,
  AuthLayoutAside,
  AuthLayoutBrand,
  AuthLayoutContent,
} from "@workspace/ui/layouts/auth-layout";
import { Command } from "lucide-react";
import { SignInForm } from "../support/layout-sign-in";
import type { ExampleProps } from "../types";

export default function LayoutAuthSplit({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <AuthLayout
      variant="split"
      className="min-h-0 w-full overflow-hidden rounded-xl border"
    >
      <AuthLayoutContent>
        <AuthLayoutBrand>
          <Command className="size-5" />
          Acme Inc
        </AuthLayoutBrand>
        <SignInForm zh={zh} />
      </AuthLayoutContent>
      <AuthLayoutAside className="bg-gradient-to-br from-primary/20 via-muted to-muted">
        <blockquote className="absolute inset-x-8 bottom-8 space-y-2">
          <p className="text-lg">
            {zh
              ? "“这个后台让团队每周节省了好几个小时。”"
              : "“This dashboard saves our team hours every week.”"}
          </p>
          <footer className="text-muted-foreground text-sm">Sofia Davis</footer>
        </blockquote>
      </AuthLayoutAside>
    </AuthLayout>
  );
}
