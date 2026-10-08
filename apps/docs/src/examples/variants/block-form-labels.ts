import type {
  BugReportFormLabels,
  FormFeedbackLabels,
  ProfileFormLabels,
} from "@workspace/ui/blocks/tanstack-form";

const chineseFeedbackLabels: FormFeedbackLabels = {
  failed: "提交失败",
  saved: "已保存",
  savedDescription: "更改已成功提交。",
  submitError: "请稍后重试。",
  submitting: "正在提交…",
  reset: "重置",
};

/** Application-owned labels for the Chinese documentation examples. */
export const chineseBugReportFormLabels: BugReportFormLabels = {
  ...chineseFeedbackLabels,
  formTitle: "报告问题",
  formDescription: "告诉我们发生了什么，帮助改进产品。",
  title: "标题",
  titlePlaceholder: "手机上的登录按钮无法使用",
  description: "问题描述",
  descriptionHint: "包含复现步骤、预期行为和实际结果。",
  titleMinLength: "标题至少 5 个字符。",
  titleMaxLength: "标题最多 80 个字符。",
  descriptionMinLength: "描述至少 20 个字符。",
  descriptionMaxLength: "描述最多 500 个字符。",
  submit: "提交报告",
};

export const chineseProfileFormLabels: ProfileFormLabels = {
  ...chineseFeedbackLabels,
  formTitle: "个人资料",
  formDescription: "更新资料和通知偏好。",
  name: "姓名",
  email: "邮箱",
  role: "角色",
  rolePlaceholder: "选择角色",
  designerRole: "设计师",
  developerRole: "开发者",
  managerRole: "管理者",
  notifications: "接收产品更新邮件",
  nameMinLength: "姓名至少 2 个字符。",
  nameMaxLength: "姓名最多 50 个字符。",
  invalidEmail: "请输入有效的邮箱。",
  invalidRole: "请选择角色。",
  submit: "保存资料",
};
