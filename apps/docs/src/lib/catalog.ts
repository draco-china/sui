export interface ComponentEntry {
  slug: string;
  name: string;
  description: { "en-US": string; "zh-CN": string };
  sourceUrl: string;
}

export const components: ComponentEntry[] = [
  {
    slug: "accordion",
    name: "Accordion",
    description: {
      "en-US":
        "A vertically stacked set of interactive headings that each reveal a section of content.",
      "zh-CN": "一组垂直堆叠的交互式标题，每个标题显示一部分内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/accordion.mdx",
  },
  {
    slug: "alert",
    name: "Alert",
    description: {
      "en-US": "Displays a callout for user attention.",
      "zh-CN": "显示标注以引起用户注意",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/alert.mdx",
  },
  {
    slug: "alert-dialog",
    name: "Alert Dialog",
    description: {
      "en-US":
        "A modal dialog that interrupts the user with important content and expects a response.",
      "zh-CN": "模式对话框，用重要内容打断用户并期望得到响应",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/alert-dialog.mdx",
  },
  {
    slug: "aspect-ratio",
    name: "Aspect Ratio",
    description: {
      "en-US": "Displays content within a desired ratio.",
      "zh-CN": "以所需的比例显示内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/aspect-ratio.mdx",
  },
  {
    slug: "attachment",
    name: "Attachment",
    description: {
      "en-US":
        "Displays a file or image attachment with media, metadata, upload state, and actions.",
      "zh-CN": "显示带有媒体、元数据、上传状态和操作的文件或图像附件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/attachment.mdx",
  },
  {
    slug: "autocomplete",
    name: "Autocomplete",
    description: {
      "en-US": "An input with suggestions that also accepts free-form text.",
      "zh-CN": "支持建议选项和自由文本的自动补全输入",
    },
    sourceUrl: "https://base-ui.com/react/components/autocomplete",
  },
  {
    slug: "avatar",
    name: "Avatar",
    description: {
      "en-US": "An image element with a fallback for representing the user.",
      "zh-CN": "具有代表用户的备用图像元素",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/avatar.mdx",
  },
  {
    slug: "badge",
    name: "Badge",
    description: {
      "en-US": "Displays a badge or a component that looks like a badge.",
      "zh-CN": "显示徽章或看起来像徽章的组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/badge.mdx",
  },
  {
    slug: "breadcrumb",
    name: "Breadcrumb",
    description: {
      "en-US":
        "Displays the path to the current resource using a hierarchy of links.",
      "zh-CN": "使用链接层次结构显示当前资源的路径",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/breadcrumb.mdx",
  },
  {
    slug: "bubble",
    name: "Bubble",
    description: {
      "en-US":
        "Displays conversational content in a message bubble. Supports variants, alignment, grouping, reactions, and collapsible content.",
      "zh-CN":
        "在消息气泡中显示对话内容。支持变体、对齐、分组、回应和可折叠内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/bubble.mdx",
  },
  {
    slug: "button",
    name: "Button",
    description: {
      "en-US": "Displays a button or a component that looks like a button.",
      "zh-CN": "显示按钮或看起来像按钮的组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/button.mdx",
  },
  {
    slug: "button-group",
    name: "Button Group",
    description: {
      "en-US":
        "A container that groups related buttons together with consistent styling.",
      "zh-CN": "将相关按钮分组在一起并具有一致样式的容器",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/button-group.mdx",
  },
  {
    slug: "calendar",
    name: "Calendar",
    description: {
      "en-US":
        "A calendar component that allows users to select a date or a range of dates.",
      "zh-CN": "允许用户选择日期或日期范围的日历组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/calendar.mdx",
  },
  {
    slug: "card",
    name: "Card",
    description: {
      "en-US": "Displays a card with header, content, and footer.",
      "zh-CN": "显示带有页眉、内容和页脚的卡片",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/card.mdx",
  },
  {
    slug: "carousel",
    name: "Carousel",
    description: {
      "en-US": "A carousel with motion and swipe built using Embla.",
      "zh-CN": "使用 Embla 构建的具有运动和滑动功能的轮播",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/carousel.mdx",
  },
  {
    slug: "chart",
    name: "Chart",
    description: {
      "en-US":
        "Beautiful charts. Built using Recharts. Copy and paste into your apps.",
      "zh-CN": "漂亮的图表。使用 Recharts 构建。复制并粘贴到您的应用程序中",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/chart.mdx",
  },
  {
    slug: "checkbox",
    name: "Checkbox",
    description: {
      "en-US":
        "A control that allows the user to toggle between checked and not checked.",
      "zh-CN": "允许用户在选中和不选中之间切换的控件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/checkbox.mdx",
  },
  {
    slug: "clipboard-text",
    name: "Clipboard Text",
    description: {
      "en-US": "Display text with a copy action and accessible feedback.",
      "zh-CN": "显示文本并提供复制操作和可访问反馈",
    },
    sourceUrl: "https://base-ui.com/react/components/button",
  },
  {
    slug: "code-viewer",
    name: "Code Viewer",
    description: {
      "en-US":
        "Syntax-highlighted code with folding, line highlights, copying, and streaming feedback.",
      "zh-CN": "支持语法高亮、折叠、行高亮、复制和流式反馈的代码查看器",
    },
    sourceUrl: "https://shiki.style/guide/",
  },
  {
    slug: "collapsible",
    name: "Collapsible",
    description: {
      "en-US": "An interactive component which expands/collapses a panel.",
      "zh-CN": "展开/折叠面板的交互式组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/collapsible.mdx",
  },
  {
    slug: "color-picker",
    name: "ColorPicker",
    description: {
      "en-US":
        "Choose colors with a saturation area, hue and opacity sliders, editable values and swatches.",
      "zh-CN": "通过饱和度区域、色相和透明度滑条、颜色值与预设色板选择颜色",
    },
    sourceUrl: "https://base-ui.com/react/components/slider",
  },
  {
    slug: "combobox",
    name: "Combobox",
    description: {
      "en-US": "Autocomplete input with a list of suggestions.",
      "zh-CN": "自动完成输入并包含建议列表",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/combobox.mdx",
  },
  {
    slug: "command",
    name: "Command",
    description: {
      "en-US": "Command menu for search and quick actions.",
      "zh-CN": "用于搜索和快速操作的命令菜单",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/command.mdx",
  },
  {
    slug: "context-menu",
    name: "Context Menu",
    description: {
      "en-US": "Displays a menu of actions triggered by a right click.",
      "zh-CN": "显示右键单击触发的操作菜单",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/context-menu.mdx",
  },
  {
    slug: "dialog",
    name: "Dialog",
    description: {
      "en-US":
        "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.",
      "zh-CN": "覆盖在主窗口或另一个对话框窗口上的窗口，使下面的内容呈现惰性",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/dialog.mdx",
  },
  {
    slug: "diff-viewer",
    name: "Diff Viewer",
    description: {
      "en-US": "A line-based code comparison with split and unified views.",
      "zh-CN": "支持并排与合并视图的逐行代码差异查看器",
    },
    sourceUrl: "https://github.com/kpdecker/jsdiff",
  },
  {
    slug: "direction",
    name: "Direction",
    description: {
      "en-US":
        "A provider component that sets the text direction for your application.",
      "zh-CN": "为您的应用程序设置文本方向的提供程序组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/direction.mdx",
  },
  {
    slug: "drawer",
    name: "Drawer",
    description: {
      "en-US": "A drawer component for React.",
      "zh-CN": "React 的抽屉组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/drawer.mdx",
  },
  {
    slug: "dropdown-menu",
    name: "Dropdown Menu",
    description: {
      "en-US":
        "Displays a menu to the user — such as a set of actions or functions — triggered by a button.",
      "zh-CN": "向用户显示由按钮触发的菜单，例如一组操作或功能",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/dropdown-menu.mdx",
  },
  {
    slug: "editor",
    name: "Editor",
    description: {
      "en-US":
        "A client-loaded code editor with preview, toolbar actions, and fullscreen modes.",
      "zh-CN": "按需加载的代码编辑器，支持内容预览、工具栏操作与全屏模式",
    },
    sourceUrl: "https://microsoft.github.io/monaco-editor/docs.html",
  },
  {
    slug: "empty",
    name: "Empty",
    description: {
      "en-US": "Use the Empty component to display an empty state.",
      "zh-CN": "使用 Empty 组件显示空状态",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/empty.mdx",
  },
  {
    slug: "field",
    name: "Field",
    description: {
      "en-US":
        "Combine labels, controls, and help text to compose accessible form fields and grouped inputs.",
      "zh-CN": "组合标签、控件和帮助文本以组成可访问的表单字段和分组输入",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/field.mdx",
  },
  {
    slug: "glass",
    name: "Glass",
    description: {
      "en-US":
        "SVG highlights and CSS frosted surfaces, progressively enhanced with WebGPU refraction.",
      "zh-CN": "以 SVG 高光和 CSS 磨砂为基础，按能力通过 WebGPU 增强真实折射",
    },
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API",
  },
  {
    slug: "hover-card",
    name: "Hover Card",
    description: {
      "en-US": "For sighted users to preview content available behind a link.",
      "zh-CN": "供视力正常的用户预览链接后面可用的内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/hover-card.mdx",
  },
  {
    slug: "html-viewer",
    name: "HTML Viewer",
    description: {
      "en-US": "An isolated iframe preview for HTML content.",
      "zh-CN": "使用独立 iframe 展示 HTML 内容的查看器",
    },
    sourceUrl:
      "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe",
  },
  {
    slug: "image-viewer",
    name: "Image Viewer",
    description: {
      "en-US":
        "A dialog image viewer with navigation, zoom, rotation, panning, and fullscreen.",
      "zh-CN": "支持切换、缩放、旋转、平移和全屏的图片查看对话框",
    },
    sourceUrl: "https://base-ui.com/react/components/dialog",
  },
  {
    slug: "inline-copy-text",
    name: "Inline Copy Text",
    description: {
      "en-US": "Copy inline text without interrupting surrounding content.",
      "zh-CN": "在行内展示并复制文本",
    },
    sourceUrl: "https://base-ui.com/react/components/button",
  },
  {
    slug: "input",
    name: "Input",
    description: {
      "en-US":
        "A text input component for forms and user data entry with built-in styling and accessibility features.",
      "zh-CN": "用于表单和用户数据输入的文本输入组件，具有内置样式和辅助功能",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/input.mdx",
  },
  {
    slug: "input-group",
    name: "Input Group",
    description: {
      "en-US": "Add addons, buttons, and helper content to inputs.",
      "zh-CN": "为输入框添加附加内容、按钮和辅助信息",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/input-group.mdx",
  },
  {
    slug: "input-otp",
    name: "Input OTP",
    description: {
      "en-US":
        "Accessible one-time password component with copy-paste functionality.",
      "zh-CN": "具有复制粘贴功能的可访问一次性密码组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/input-otp.mdx",
  },
  {
    slug: "item",
    name: "Item",
    description: {
      "en-US":
        "A versatile component for displaying content with media, title, description, and actions.",
      "zh-CN": "一个多功能组件，用于显示带有媒体、标题、描述和操作的内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/item.mdx",
  },
  {
    slug: "kbd",
    name: "Kbd",
    description: {
      "en-US": "Used to display textual user input from keyboard.",
      "zh-CN": "用于显示来自键盘的文本用户输入",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/kbd.mdx",
  },
  {
    slug: "label",
    name: "Label",
    description: {
      "en-US": "Renders an accessible label associated with controls.",
      "zh-CN": "呈现与控件关联的可访问标签",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/label.mdx",
  },
  {
    slug: "loader",
    name: "Loader",
    description: {
      "en-US":
        "Loading indicators with consistent sizing and reduced-motion support.",
      "zh-CN": "具有统一尺寸并支持减少动态效果的加载指示器",
    },
    sourceUrl:
      "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role",
  },
  {
    slug: "locale-toggle",
    name: "Locale Toggle",
    description: {
      "en-US":
        "A controlled language button or selector without routing or persistence assumptions.",
      "zh-CN": "受控语言切换按钮或选择器，不预设路由与持久化方式",
    },
    sourceUrl: "https://base-ui.com/react/components/select",
  },
  {
    slug: "long-text",
    name: "LongText",
    description: {
      "en-US":
        "Truncated text with overflow-aware hover, focus, and tap disclosure.",
      "zh-CN": "长文本截断，溢出时支持悬停、聚焦或点击查看全文",
    },
    sourceUrl:
      "https://github.com/satnaing/shadcn-admin/blob/main/src/components/long-text.tsx",
  },
  {
    slug: "markdown-viewer",
    name: "Markdown Viewer",
    description: {
      "en-US":
        "Markdown rendering with tables, task lists, alerts, highlighted code, and sanitized HTML.",
      "zh-CN":
        "支持表格、任务列表、提示块、代码高亮和 HTML 清理的 Markdown 查看器",
    },
    sourceUrl: "https://github.com/remarkjs/react-markdown",
  },
  {
    slug: "marker",
    name: "Marker",
    description: {
      "en-US":
        "Displays an inline status, system note, bordered row, or labeled separator in a conversation.",
      "zh-CN": "显示对话中的内联状态、系统注释、边框行或带标签的分隔符",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/marker.mdx",
  },
  {
    slug: "menubar",
    name: "Menubar",
    description: {
      "en-US":
        "A visually persistent menu common in desktop applications that provides quick access to a consistent set of commands.",
      "zh-CN":
        "桌面应用程序中常见的视觉持久菜单，可提供对一组一致命令的快速访问",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/menubar.mdx",
  },
  {
    slug: "message",
    name: "Message",
    description: {
      "en-US":
        "Displays a message in a conversation, with optional avatar, header, footer, and alignment.",
      "zh-CN": "显示对话中的消息，带有可选的头像、页眉、页脚和对齐方式",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/message.mdx",
  },
  {
    slug: "message-scroller",
    name: "Message Scroller",
    description: {
      "en-US":
        "A chat scroll container that anchors turns, opens saved transcripts, follows streamed responses, loads history without jumping, and jumps to any message.",
      "zh-CN":
        "聊天滚动容器：锚定对话轮次、恢复已保存的记录、跟随流式回复、稳定加载历史消息，并跳转至指定消息",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/message-scroller.mdx",
  },
  {
    slug: "native-select",
    name: "Native Select",
    description: {
      "en-US":
        "A styled native HTML select element with consistent design system integration.",
      "zh-CN": "具有一致设计系统集成的样式化原生 HTML 选择元素",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/native-select.mdx",
  },
  {
    slug: "navigation-menu",
    name: "Navigation Menu",
    description: {
      "en-US": "A collection of links for navigating websites.",
      "zh-CN": "用于导航网站的链接的集合",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/navigation-menu.mdx",
  },
  {
    slug: "pagination",
    name: "Pagination",
    description: {
      "en-US":
        "Compact data pagination with range information, page navigation, and page-size selection.",
      "zh-CN": "紧凑的数据分页，支持范围摘要、页码导航和每页条数选择",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/pagination.mdx",
  },
  {
    slug: "navigation-progress",
    name: "NavigationProgress",
    description: {
      "en-US":
        "A router-independent navigation bar with delayed start and completion feedback.",
      "zh-CN": "通过受控加载状态展示延迟出现、完成收尾的导航进度条",
    },
    sourceUrl:
      "https://github.com/satnaing/shadcn-admin/blob/main/src/components/navigation-progress.tsx",
  },

  {
    slug: "popover",
    name: "Popover",
    description: {
      "en-US": "Displays rich content in a portal, triggered by a button.",
      "zh-CN": "通过按钮触发，在门户中显示丰富的内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/popover.mdx",
  },
  {
    slug: "progress",
    name: "Progress",
    description: {
      "en-US":
        "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
      "zh-CN": "显示任务完成进度的指示器，通常显示为进度条",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/progress.mdx",
  },
  {
    slug: "qr-code",
    name: "QRCode",
    description: {
      "en-US":
        "A generated black-and-white QR code with loading feedback and optional reveal animation.",
      "zh-CN": "支持加载反馈、黑白画面和可选揭示动画的二维码组件",
    },
    sourceUrl: "https://github.com/kozakdenys/qr-code-styling",
  },
  {
    slug: "questionnaire",
    name: "Questionnaire",
    description: {
      "en-US":
        "A multi-step questionnaire with single-choice, multiple-choice, freeform, and skippable questions.",
      "zh-CN": "多步骤调查问卷，包括单项选择、多项选择、自由形式和可跳过的问题",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/questionnaire.mdx",
  },
  {
    slug: "radio-group",
    name: "Radio Group",
    description: {
      "en-US":
        "A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.",
      "zh-CN": "一组可检查按钮（称为单选按钮），一次只能检查一个按钮",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/radio-group.mdx",
  },
  {
    slug: "resizable",
    name: "Resizable",
    description: {
      "en-US":
        "Accessible resizable panel groups and layouts with keyboard support.",
      "zh-CN": "通过键盘支持可访问可调整大小的面板组和布局",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/resizable.mdx",
  },
  {
    slug: "scroll-area",
    name: "Scroll Area",
    description: {
      "en-US":
        "Augments native scroll functionality for custom, cross-browser styling.",
      "zh-CN": "增强了自定义跨浏览器样式的本机滚动功能",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/scroll-area.mdx",
  },
  {
    slug: "select",
    name: "Select",
    description: {
      "en-US":
        "Displays a list of options for the user to pick from—triggered by a button.",
      "zh-CN": "显示选项列表供用户选择（由按钮触发）",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/select.mdx",
  },
  {
    slug: "sensitive-input",
    name: "Sensitive Input",
    description: {
      "en-US": "A password input with an accessible visibility toggle.",
      "zh-CN": "带有可访问显隐切换的敏感信息输入",
    },
    sourceUrl: "https://base-ui.com/react/components/input",
  },
  {
    slug: "separator",
    name: "Separator",
    description: {
      "en-US": "Visually or semantically separates content.",
      "zh-CN": "在视觉上或语义上分隔内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/separator.mdx",
  },
  {
    slug: "sheet",
    name: "Sheet",
    description: {
      "en-US":
        "Extends the Dialog component to display content that complements the main content of the screen.",
      "zh-CN": "扩展 Dialog 组件以显示补充屏幕主要内容的内容",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/sheet.mdx",
  },
  {
    slug: "sidebar",
    name: "Sidebar",
    description: {
      "en-US": "A composable, themeable and customizable sidebar component.",
      "zh-CN": "一个可组合、可主题化和可定制的侧边栏组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/sidebar.mdx",
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    description: {
      "en-US": "Use to show a placeholder while content is loading.",
      "zh-CN": "用于在加载内容时显示占位符",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/skeleton.mdx",
  },
  {
    slug: "slider",
    name: "Slider",
    description: {
      "en-US":
        "An input where the user selects a value from within a given range.",
      "zh-CN": "用户从给定范围内选择一个值的输入",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/slider.mdx",
  },
  {
    slug: "switch",
    name: "Switch",
    description: {
      "en-US":
        "A control that allows the user to toggle between checked and not checked.",
      "zh-CN": "允许用户在选中和不选中之间切换的控件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/switch.mdx",
  },
  {
    slug: "tab-bar",
    name: "TabBar",
    description: {
      "en-US":
        "Controlled application navigation with press-and-slide selection and optional glass material.",
      "zh-CN": "支持受控应用导航、长按滑动选择和可选玻璃材质的 TabBar",
    },
    sourceUrl:
      "https://developer.apple.com/design/human-interface-guidelines/tab-bars",
  },
  {
    slug: "table",
    name: "Table",
    description: {
      "en-US": "A responsive table component.",
      "zh-CN": "响应式表格组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/table.mdx",
  },
  {
    slug: "tabs",
    name: "Tabs",
    description: {
      "en-US":
        "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
      "zh-CN": "一组分层的内容部分（称为选项卡面板），一次显示一个",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/tabs.mdx",
  },
  {
    slug: "tag-input",
    name: "Tag Input",
    description: {
      "en-US": "Create and select multiple tags with keyboard support.",
      "zh-CN": "支持键盘操作、自由添加和选择多个标签",
    },
    sourceUrl: "https://base-ui.com/react/components/combobox",
  },
  {
    slug: "textarea",
    name: "Textarea",
    description: {
      "en-US":
        "Displays a form textarea or a component that looks like a textarea.",
      "zh-CN": "显示表单文本区域或看起来像文本区域的组件",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/textarea.mdx",
  },
  {
    slug: "theme-toggle",
    name: "Theme Toggle",
    description: {
      "en-US":
        "A controlled light/dark switch with optional view-transition effects.",
      "zh-CN": "支持可选视图过渡效果的受控明暗主题切换按钮",
    },
    sourceUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API",
  },
  {
    slug: "toast",
    name: "Toast",
    description: {
      "en-US": "A succinct message that is displayed temporarily.",
      "zh-CN": "暂时显示的简洁消息",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/toast.mdx",
  },
  {
    slug: "toggle",
    name: "Toggle",
    description: {
      "en-US": "A two-state button that can be either on or off.",
      "zh-CN": "可以打开或关闭的两种状态按钮",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/toggle.mdx",
  },
  {
    slug: "toggle-group",
    name: "Toggle Group",
    description: {
      "en-US": "A set of two-state buttons that can be toggled on or off.",
      "zh-CN": "一组可以打开或关闭的两种状态按钮",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/toggle-group.mdx",
  },
  {
    slug: "toolbar",
    name: "Toolbar",
    description: {
      "en-US": "A group of actions with arrow-key focus navigation.",
      "zh-CN": "支持方向键焦点导航的操作工具栏",
    },
    sourceUrl: "https://base-ui.com/react/components/toolbar",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    description: {
      "en-US":
        "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
      "zh-CN":
        "当元素接收键盘焦点或鼠标悬停在其上时显示与该元素相关的信息的弹出窗口",
    },
    sourceUrl:
      "https://github.com/shadcn-ui/ui/blob/f56bbd7282f0116a925a601cb6d7e0c3fede448b/apps/v4/content/docs/components/base/tooltip.mdx",
  },
];
