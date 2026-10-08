import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export function TabsDisabled() {
  return (
    <Tabs defaultValue="home">
      <TabsList>
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="settings" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default TabsDisabled;
