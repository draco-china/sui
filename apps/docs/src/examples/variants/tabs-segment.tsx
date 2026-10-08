import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

export function TabsSegment() {
  return (
    <Tabs defaultValue="week" className="w-full max-w-xs">
      <TabsList variant="segment" wrapperClassName="w-full">
        <TabsTrigger value="day">Day</TabsTrigger>
        <TabsTrigger value="week">Week</TabsTrigger>
        <TabsTrigger value="month">Month</TabsTrigger>
      </TabsList>
      <TabsContent value="day">View today's activity.</TabsContent>
      <TabsContent value="week">View this week's activity.</TabsContent>
      <TabsContent value="month">View this month's activity.</TabsContent>
    </Tabs>
  );
}

export default function Preview() {
  return (
    <div className="flex w-full justify-center">
      <TabsSegment />
    </div>
  );
}
