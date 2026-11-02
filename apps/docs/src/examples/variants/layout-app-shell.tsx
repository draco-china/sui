"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { AppHeader } from "@workspace/ui/layouts/app-header";
import { AppMain } from "@workspace/ui/layouts/app-main";
import { AppInset, AppShell } from "@workspace/ui/layouts/app-shell";
import { AppSidebar } from "@workspace/ui/layouts/app-sidebar";
import type {
  LayoutCollapsible,
  LayoutVariant,
  NavGroupData,
} from "@workspace/ui/layouts/types";
import {
  Bell,
  Command,
  LayoutDashboard,
  ListTodo,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useDemoRouter } from "../support/layout-router";
import type { ExampleProps } from "../types";

export default function LayoutAppShell({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const router = useDemoRouter("/");
  const [variant, setVariant] = useState<LayoutVariant>("inset");
  const [collapsible, setCollapsible] = useState<LayoutCollapsible>("icon");
  const navGroups: NavGroupData[] = [
    {
      title: zh ? "常用" : "General",
      items: [
        {
          title: zh ? "仪表盘" : "Dashboard",
          href: "/",
          icon: LayoutDashboard,
        },
        { title: zh ? "任务" : "Tasks", href: "/tasks", icon: ListTodo },
        {
          title: zh ? "消息" : "Chats",
          href: "/chats",
          icon: MessagesSquare,
          badge: 3,
        },
        { title: zh ? "用户" : "Users", href: "/users", icon: Users },
      ],
    },
    {
      title: zh ? "其他" : "Other",
      items: [
        {
          title: zh ? "设置" : "Settings",
          icon: Settings,
          items: [
            { title: zh ? "个人资料" : "Profile", href: "/settings" },
            { title: zh ? "账户" : "Account", href: "/settings/account" },
            {
              title: zh ? "通知" : "Notifications",
              href: "/settings/notifications",
              icon: Bell,
            },
          ],
        },
      ],
    },
  ];
  const title = navGroups
    .flatMap((group) => group.items.flatMap((item) => item.items ?? [item]))
    .find((item) => item.href === router.currentPath)?.title;

  return (
    <AppShell
      {...router}
      variant={variant}
      collapsible={collapsible}
      className="relative isolate h-[32rem] min-h-0 overflow-hidden rounded-xl border"
    >
      <AppSidebar
        className="absolute! inset-y-0! h-full!"
        navGroups={navGroups}
        header={
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
        footer={
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <Avatar className="size-8 shrink-0 rounded-lg">
                  <AvatarFallback className="rounded-lg">SN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">satnaing</span>
                  <span className="truncate text-xs">m@example.com</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
      />
      <AppInset>
        <AppHeader
          fixed
          breadcrumb={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
        >
          <Button variant="outline" size="sm" className="ms-auto">
            {zh ? "新建" : "New"}
          </Button>
        </AppHeader>
        <AppMain className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <NativeSelect
              size="sm"
              aria-label={zh ? "侧栏样式" : "Sidebar variant"}
              value={variant}
              onChange={(event) =>
                setVariant(event.target.value as LayoutVariant)
              }
            >
              <NativeSelectOption value="inset">inset</NativeSelectOption>
              <NativeSelectOption value="sidebar">sidebar</NativeSelectOption>
              <NativeSelectOption value="floating">floating</NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              size="sm"
              aria-label={zh ? "折叠方式" : "Collapse behavior"}
              value={collapsible}
              onChange={(event) =>
                setCollapsible(event.target.value as LayoutCollapsible)
              }
            >
              <NativeSelectOption value="icon">icon</NativeSelectOption>
              <NativeSelectOption value="offcanvas">
                offcanvas
              </NativeSelectOption>
              <NativeSelectOption value="none">none</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-28 rounded-2xl bg-muted/60" />
            ))}
          </div>
          <div className="h-[28rem] rounded-2xl bg-muted/40" />
        </AppMain>
      </AppInset>
    </AppShell>
  );
}
