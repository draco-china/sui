"use client";

import { AppHeader } from "@workspace/ui/layouts/app-header";
import { AppMain } from "@workspace/ui/layouts/app-main";
import { LayoutProvider } from "@workspace/ui/layouts/layout-provider";
import { TopNav } from "@workspace/ui/layouts/top-nav";
import { useDemoRouter } from "../support/layout-router";
import type { ExampleProps } from "../types";

export default function LayoutTopNav({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const router = useDemoRouter("/overview");
  const links = [
    { title: zh ? "概览" : "Overview", href: "/overview" },
    { title: zh ? "客户" : "Customers", href: "/customers" },
    { title: zh ? "产品" : "Products", href: "/products" },
    { title: zh ? "设置" : "Settings", href: "/settings", disabled: true },
  ];
  return (
    <LayoutProvider {...router}>
      <div className="h-80 w-full overflow-auto rounded-xl border">
        <AppHeader fixed sidebarTrigger={false} className="border-b">
          <TopNav
            links={links}
            labels={zh ? { navigation: "主导航", menu: "打开导航" } : undefined}
          />
        </AppHeader>
        <AppMain>
          <p className="text-muted-foreground text-sm">
            {zh ? "当前路径：" : "Current path: "}
            <code>{router.currentPath}</code>
          </p>
          <div className="mt-4 h-96 rounded-2xl bg-muted/40" />
        </AppMain>
      </div>
    </LayoutProvider>
  );
}
