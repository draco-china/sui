"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { BellIcon, HomeIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { TabBarStage } from "../support/tab-bar-stage";

export default function Example() {
  const [value, setValue] = useState("home");
  return (
    <TabBarStage>
      <TabBar
        dir="rtl"
        glass
        aria-label="التنقل"
        items={[
          { value: "home", label: "الرئيسية", icon: <HomeIcon /> },
          { value: "activity", label: "النشاط", icon: <BellIcon /> },
          { value: "settings", label: "الإعدادات", icon: <SettingsIcon /> },
        ]}
        value={value}
        onValueChange={setValue}
        search={{ label: "بحث" }}
      />
    </TabBarStage>
  );
}
