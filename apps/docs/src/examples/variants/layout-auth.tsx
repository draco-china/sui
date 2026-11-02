"use client";

import {
  AuthLayout,
  AuthLayoutBrand,
  AuthLayoutContent,
} from "@workspace/ui/layouts/auth-layout";
import { Command } from "lucide-react";
import { SignInForm } from "../support/layout-sign-in";
import type { ExampleProps } from "../types";

export default function LayoutAuth({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <AuthLayout className="min-h-0 w-full rounded-xl border bg-muted/30">
      <AuthLayoutContent>
        <AuthLayoutBrand>
          <Command className="size-5" />
          Acme Inc
        </AuthLayoutBrand>
        <SignInForm zh={zh} />
      </AuthLayoutContent>
    </AuthLayout>
  );
}
