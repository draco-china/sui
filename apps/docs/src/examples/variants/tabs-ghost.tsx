import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

export function TabsGhost() {
  return (
    <Tabs defaultValue="overview" className="w-full max-w-md">
      <TabsList variant="ghost">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">See how the project is doing.</TabsContent>
      <TabsContent value="activity">Review recent changes.</TabsContent>
      <TabsContent value="settings">Adjust the project.</TabsContent>
    </Tabs>
  );
}

export function TabsGhostVertical() {
  return (
    <Tabs
      defaultValue="profile"
      orientation="vertical"
      className="w-full max-w-md flex-row gap-6"
    >
      <TabsList variant="ghost">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">Edit your name and avatar.</TabsContent>
      <TabsContent value="security">Change your password.</TabsContent>
      <TabsContent value="billing">Manage your plan.</TabsContent>
    </Tabs>
  );
}

export default function Preview() {
  return (
    <div className="flex w-full flex-col items-center gap-10">
      <TabsGhost />
      <TabsGhostVertical />
    </div>
  );
}
