import type {
  DataTableColumn,
  DataTableOption,
} from "@workspace/ui/components/data-table";
import type { User } from "./data-table-users";

export function userOptions(zh: boolean) {
  const status: DataTableOption[] = [
    { value: "active", label: zh ? "启用" : "Active", color: "default" },
    { value: "invited", label: zh ? "已邀请" : "Invited", color: "outline" },
    {
      value: "suspended",
      label: zh ? "已停用" : "Suspended",
      color: "destructive",
    },
  ];
  const role: DataTableOption[] = [
    { value: "admin", label: zh ? "管理员" : "Admin" },
    { value: "editor", label: zh ? "编辑" : "Editor" },
    { value: "viewer", label: zh ? "访客" : "Viewer" },
  ];
  return { status, role };
}

/** Columns shared by several examples; each example adds its own. */
export function userColumns(zh: boolean): DataTableColumn<User>[] {
  const { status, role } = userOptions(zh);
  return [
    {
      key: "name",
      title: zh ? "姓名" : "Name",
      keyword: true,
      sortable: true,
      primary: true,
    },
    {
      key: "email",
      title: zh ? "邮箱" : "Email",
      keyword: true,
      ellipsis: true,
      width: 220,
    },
    { key: "status", title: zh ? "状态" : "Status", valueEnum: status },
    { key: "role", title: zh ? "角色" : "Role", valueEnum: role },
    {
      key: "amount",
      title: zh ? "消费" : "Spend",
      valueType: "money",
      align: "end",
      sortable: true,
    },
    {
      key: "createdAt",
      title: zh ? "创建时间" : "Created",
      valueType: "date",
      sortable: true,
    },
  ];
}
