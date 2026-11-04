"use client";

import { LayoutProvider } from "@workspace/ui/layouts/layout-provider";
import { SectionLayout } from "@workspace/ui/layouts/section-layout";
import { Bell, Monitor, Palette, UserCog, Wrench } from "lucide-react";
import { useDemoRouter } from "../support/layout-router";
import type { ExampleProps } from "../types";

export default function LayoutSectionHorizontal({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const router = useDemoRouter("/settings");
  const items = [
    { title: zh ? "个人资料" : "Profile", href: "/settings", icon: UserCog },
    { title: zh ? "账户" : "Account", href: "/settings/account", icon: Wrench },
    {
      title: zh ? "外观" : "Appearance",
      href: "/settings/appearance",
      icon: Palette,
    },
    {
      title: zh ? "通知" : "Notifications",
      href: "/settings/notifications",
      icon: Bell,
    },
    {
      title: zh ? "显示" : "Display",
      href: "/settings/display",
      icon: Monitor,
    },
  ];
  const current = items.find((item) => item.href === router.currentPath);
  return (
    <LayoutProvider {...router}>
      <SectionLayout
        className="w-full rounded-xl border p-6"
        title={zh ? "设置" : "Settings"}
        description={
          zh
            ? "管理账户设置和邮件偏好。"
            : "Manage your account settings and email preferences."
        }
        orientation="horizontal"
        items={items}
      >
        <h2 className="font-medium text-lg">{current?.title}</h2>
        <div className="mt-4 h-48 rounded-2xl bg-muted/40" />
      </SectionLayout>
    </LayoutProvider>
  );
}
