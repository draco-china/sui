import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { BellIcon, HomeIcon, UserIcon } from "lucide-react";

export function TabsIconsSelected() {
  return (
    <Tabs defaultValue="home" icons="selected">
      <TabsList>
        <TabsTrigger value="home" icon={<HomeIcon />}>
          Home
        </TabsTrigger>
        <TabsTrigger value="activity" icon={<BellIcon />}>
          Activity
        </TabsTrigger>
        <TabsTrigger value="profile" icon={<UserIcon />}>
          Profile
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default TabsIconsSelected;
