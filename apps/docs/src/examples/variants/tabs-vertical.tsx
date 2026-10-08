import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import type { ExampleProps } from "../types";

export function TabsVertical({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <Tabs
      defaultValue="account"
      orientation="vertical"
      className="w-full max-w-md gap-4"
    >
      <TabsList aria-label={chinese ? "账户设置" : "Account settings"}>
        <TabsTrigger value="account">
          {chinese ? "账户" : "Account"}
        </TabsTrigger>
        <TabsTrigger value="password">
          {chinese ? "密码" : "Password"}
        </TabsTrigger>
        <TabsTrigger value="notifications">
          {chinese ? "通知" : "Notifications"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>{chinese ? "账户" : "Account"}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {chinese
              ? "在此查看你的个人资料与账户偏好"
              : "View your profile and account preferences here."}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password" className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>{chinese ? "密码" : "Password"}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {chinese
              ? "使用唯一密码并启用双重验证以保护账户"
              : "Protect your account with a unique password and two-factor authentication."}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications" className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>{chinese ? "通知" : "Notifications"}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {chinese
              ? "项目更新与账户提醒将发送到你的邮箱"
              : "Project updates and account alerts are delivered to your inbox."}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default TabsVertical;
