import { cn } from "cn";
import { BellIcon, BookmarkIcon, HomeIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Destinations shared by the Tab Bar examples. */
export function tabBarItems(chinese: boolean) {
  return [
    { value: "home", label: chinese ? "首页" : "Home", icon: <HomeIcon /> },
    {
      value: "saved",
      label: chinese ? "收藏" : "Saved",
      icon: <BookmarkIcon />,
    },
    {
      value: "activity",
      label: chinese ? "动态" : "Activity",
      icon: <BellIcon />,
    },
    {
      value: "settings",
      label: chinese ? "设置" : "Settings",
      icon: <SettingsIcon />,
    },
  ];
}

/** A colorful backdrop, so glass and frosted material have something to show. */
export function TabBarStage({
  status,
  children,
  className,
}: {
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex min-h-64 w-full flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl bg-muted p-6",
        className,
      )}
    >
      <div
        className="absolute inset-0 -z-10 grid grid-cols-3 gap-3 p-3"
        aria-hidden="true"
      >
        <div className="rounded-2xl bg-blue-400/60" />
        <div className="rounded-2xl bg-emerald-400/60" />
        <div className="rounded-2xl bg-rose-400/60" />
      </div>
      <p className="text-center text-sm" aria-live="polite">
        {status}
      </p>
      {children}
    </div>
  );
}
