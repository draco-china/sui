import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

const tabs = [
  "Overview",
  "Activity",
  "Analytics",
  "Members",
  "Billing",
  "Settings",
];

export function TabsOverflow() {
  return (
    <Tabs defaultValue="Overview" className="w-full max-w-xs">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab} value={tab}>
          Manage your project's {tab.toLowerCase()}.
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default function Preview() {
  return (
    <div className="flex w-full justify-center">
      <TabsOverflow />
    </div>
  );
}
