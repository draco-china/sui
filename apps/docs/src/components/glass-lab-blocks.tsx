import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { ClipboardText } from "@workspace/ui/components/clipboard-text";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@workspace/ui/components/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@workspace/ui/components/menubar";
import {
  Pagination,
  PaginationControls,
} from "@workspace/ui/components/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { QRCode } from "@workspace/ui/components/qr-code";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { SensitiveInput } from "@workspace/ui/components/sensitive-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { TagInput } from "@workspace/ui/components/tag-input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Toaster } from "@workspace/ui/components/toast";
import { Toggle } from "@workspace/ui/components/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "@workspace/ui/components/toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "cn";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  BellIcon,
  BluetoothIcon,
  BoldIcon,
  CalendarIcon,
  ChevronDownIcon,
  CloudSunIcon,
  HeartIcon,
  HomeIcon,
  ItalicIcon,
  LibraryIcon,
  MoonIcon,
  PauseIcon,
  PlaneIcon,
  PlayIcon,
  SearchIcon,
  SettingsIcon,
  Share2Icon,
  SkipBackIcon,
  SkipForwardIcon,
  SunIcon,
  UnderlineIcon,
  UserIcon,
  Volume2Icon,
  WifiIcon,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { withGlass } from "../../../../packages/ui/src/lib/glass/context";
import type { ExampleProps } from "../examples/types";

// Panels follow the Playground switch: glass in Glass mode, ordinary otherwise.
const Panel = withGlass(({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="glass-lab-panel"
    className={cn(
      "rounded-3xl border bg-popover p-4 text-popover-foreground shadow-sm",
      className,
    )}
    {...props}
  />
));

function Block({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      data-lab-block
      className={cn(
        "mb-6 inline-grid w-full min-w-0 break-inside-avoid gap-3 align-top",
        className,
      )}
    >
      <h2 className="px-1 font-medium text-white/90 text-xs drop-shadow-sm">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NowPlaying({ zh }: { zh: boolean }) {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(38);
  const minutes = (value: number) =>
    `${Math.floor((value * 2.4) / 60)}:${String(Math.round(value * 2.4) % 60).padStart(2, "0")}`;
  return (
    <Block title={zh ? "正在播放" : "Now playing"}>
      <Panel className="grid gap-4">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="size-14 shrink-0 rounded-2xl bg-linear-to-br from-sky-400 via-indigo-500 to-fuchsia-500"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">
              {zh ? "海岸线" : "Coastline"}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {zh ? "潮汐乐队" : "The Tides"}
            </p>
          </div>
          <Toggle aria-label={zh ? "喜欢" : "Like"} size="sm">
            <HeartIcon />
          </Toggle>
        </div>
        <div className="grid gap-1.5">
          <Slider
            aria-label={zh ? "播放进度" : "Playback position"}
            value={[progress]}
            onValueChange={(value) =>
              setProgress(Array.isArray(value) ? value[0] : value)
            }
          />
          <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
            <span>{minutes(progress)}</span>
            <span>{minutes(100)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={zh ? "上一首" : "Previous"}
          >
            <SkipBackIcon />
          </Button>
          <Button
            size="icon-lg"
            aria-label={
              playing ? (zh ? "暂停" : "Pause") : zh ? "播放" : "Play"
            }
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={zh ? "下一首" : "Next"}
          >
            <SkipForwardIcon />
          </Button>
        </div>
      </Panel>
    </Block>
  );
}

function ControlCenter({ zh }: { zh: boolean }) {
  return (
    <Block title={zh ? "控制中心" : "Control center"}>
      <div className="grid grid-cols-2 gap-3">
        <Panel className="grid place-items-center p-3">
          <ToggleGroup
            multiple
            defaultValue={["wifi", "bluetooth"]}
            aria-label={zh ? "连接" : "Connectivity"}
          >
            <ToggleGroupItem value="wifi" aria-label="Wi-Fi">
              <WifiIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="bluetooth" aria-label="Bluetooth">
              <BluetoothIcon />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="airplane"
              aria-label={zh ? "飞行模式" : "Airplane mode"}
            >
              <PlaneIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </Panel>
        <Panel className="flex items-center justify-between gap-2 p-3">
          <span className="flex items-center gap-2 font-medium text-sm">
            <MoonIcon className="size-4" />
            {zh ? "专注" : "Focus"}
          </span>
          <Switch defaultChecked aria-label={zh ? "专注模式" : "Focus mode"} />
        </Panel>
        <Panel className="col-span-2 grid gap-4">
          {[
            {
              label: zh ? "亮度" : "Brightness",
              icon: SunIcon,
              value: 70,
            },
            {
              label: zh ? "音量" : "Volume",
              icon: Volume2Icon,
              value: 45,
            },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <Slider aria-label={label} defaultValue={[value]} />
            </div>
          ))}
        </Panel>
      </div>
    </Block>
  );
}

function Navigation({ zh }: { zh: boolean }) {
  const [value, setValue] = useState("home");
  return (
    <Block title={zh ? "导航" : "Navigation"}>
      <div className="grid justify-items-center gap-4">
        <Tabs defaultValue="week">
          <TabsList aria-label={zh ? "时间范围" : "Time range"}>
            <TabsTrigger value="day">{zh ? "日" : "Day"}</TabsTrigger>
            <TabsTrigger value="week">{zh ? "周" : "Week"}</TabsTrigger>
            <TabsTrigger value="month">{zh ? "月" : "Month"}</TabsTrigger>
          </TabsList>
        </Tabs>
        <TabBar
          aria-label={zh ? "应用导航" : "App navigation"}
          value={value}
          onValueChange={setValue}
          className="max-w-full"
          items={[
            { value: "home", label: zh ? "首页" : "Home", icon: <HomeIcon /> },
            {
              value: "library",
              label: zh ? "资料库" : "Library",
              icon: <LibraryIcon />,
            },
            {
              value: "search",
              label: zh ? "搜索" : "Search",
              icon: <SearchIcon />,
            },
          ]}
        />
      </div>
    </Block>
  );
}

function Editing({ zh }: { zh: boolean }) {
  return (
    <Block title={zh ? "工具栏与菜单" : "Toolbar and menus"}>
      <div className="grid justify-items-center gap-4">
        <Menubar>
          {(
            [
              ["file", zh ? "文件" : "File"],
              ["edit", zh ? "编辑" : "Edit"],
              ["view", zh ? "显示" : "View"],
            ] as const
          ).map(([key, label]) => (
            <MenubarMenu key={key}>
              <MenubarTrigger>{label}</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {zh ? "新建" : "New"}
                  <MenubarShortcut>⌘N</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  {zh ? "打开…" : "Open…"}
                  <MenubarShortcut>⌘O</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem>{zh ? "共享" : "Share"}</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          ))}
        </Menubar>
        <Toolbar aria-label={zh ? "文本格式" : "Text formatting"}>
          {[
            { label: zh ? "粗体" : "Bold", icon: BoldIcon },
            { label: zh ? "斜体" : "Italic", icon: ItalicIcon },
            { label: zh ? "下划线" : "Underline", icon: UnderlineIcon },
          ].map(({ label, icon: Icon }) => (
            <ToolbarButton
              key={label}
              render={<Toggle size="sm" aria-label={label} />}
            >
              <Icon />
            </ToolbarButton>
          ))}
          <ToolbarSeparator />
          <ToolbarButton render={<Button variant="ghost" size="sm" />}>
            <Share2Icon />
            {zh ? "共享" : "Share"}
          </ToolbarButton>
        </Toolbar>
        <ButtonGroup aria-label={zh ? "邮件操作" : "Mail actions"}>
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon"
              aria-label={zh ? "返回" : "Back"}
            >
              <ArrowLeftIcon />
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline">
              <ArchiveIcon />
              {zh ? "归档" : "Archive"}
            </Button>
            <Button variant="outline">{zh ? "举报" : "Report"}</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline">{zh ? "稍后提醒" : "Snooze"}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={zh ? "更多" : "More"}
                  />
                }
              >
                <ChevronDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  {zh ? "标为未读" : "Mark as unread"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {zh ? "加星标" : "Add star"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </ButtonGroup>
      </div>
    </Block>
  );
}

const fruits = ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"];
const cities = ["Shanghai", "Tokyo", "Lisbon", "San Francisco", "Reykjavík"];

function Popups({ zh }: { zh: boolean }) {
  return (
    <Block title={zh ? "弹出菜单" : "Popups"}>
      <Panel className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Select
            items={fruits.map((value) => ({ value, label: value }))}
            defaultValue="Blueberry"
          >
            <SelectTrigger
              className="w-full"
              aria-label={zh ? "水果" : "Fruit"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fruits.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Combobox items={cities}>
            <ComboboxInput
              placeholder={zh ? "城市" : "City"}
              aria-label={zh ? "城市" : "City"}
            />
            <ComboboxContent>
              <ComboboxEmpty>{zh ? "没有结果" : "No results"}</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <UserIcon />
              {zh ? "账户" : "Account"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {zh ? "我的账户" : "My account"}
                </DropdownMenuLabel>
                <DropdownMenuItem>
                  {zh ? "个人资料" : "Profile"}
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {zh ? "设置" : "Settings"}
                  <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                {zh ? "退出登录" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              <CalendarIcon />
              {zh ? "提醒" : "Reminder"}
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <p className="font-medium text-sm">
                {zh ? "明天 9:00" : "Tomorrow at 9:00"}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                {zh ? "与设计团队同步进度。" : "Sync with the design team."}
              </p>
            </PopoverContent>
          </Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={zh ? "设置" : "Settings"}
                  />
                }
              >
                <SettingsIcon />
              </TooltipTrigger>
              <TooltipContent>{zh ? "偏好设置" : "Preferences"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Panel>
    </Block>
  );
}

function Overlays({ zh }: { zh: boolean }) {
  return (
    <Block title={zh ? "对话框与面板" : "Dialogs and sheets"}>
      <Panel className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            {zh ? "对话框" : "Dialog"}
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{zh ? "重命名项目" : "Rename project"}</DialogTitle>
              <DialogDescription>
                {zh
                  ? "新名称会同步给所有协作者。"
                  : "The new name syncs to every collaborator."}
              </DialogDescription>
            </DialogHeader>
            <Input
              aria-label={zh ? "项目名称" : "Project name"}
              defaultValue={zh ? "海岸计划" : "Coastline"}
            />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {zh ? "取消" : "Cancel"}
              </DialogClose>
              <DialogClose render={<Button />}>
                {zh ? "保存" : "Save"}
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            {zh ? "确认操作" : "Confirm"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {zh ? "删除这段录音？" : "Delete this recording?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {zh
                  ? "删除后将无法恢复。"
                  : "This recording cannot be restored afterwards."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{zh ? "取消" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction>{zh ? "删除" : "Delete"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            {zh ? "侧边面板" : "Sheet"}
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{zh ? "详情" : "Details"}</SheetTitle>
              <SheetDescription>
                {zh
                  ? "面板浮在内容之上，内部保持普通内容。"
                  : "The sheet floats above content; its body stays ordinary."}
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Panel>
    </Block>
  );
}

function Notifications({ zh }: { zh: boolean }) {
  const [manager] = useState(() => ToastPrimitive.createToastManager());
  return (
    <Block title={zh ? "通知" : "Notifications"}>
      <Toaster toastManager={manager}>
        <Panel className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BellIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate font-medium text-sm">
                {zh ? "日历" : "Calendar"}
              </p>
              <span className="shrink-0 text-muted-foreground text-xs">
                {zh ? "现在" : "now"}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              {zh
                ? "设计评审将在 10 分钟后开始。"
                : "Design review starts in 10 minutes."}
            </p>
          </div>
        </Panel>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() =>
            manager.add({
              title: zh ? "已共享" : "Shared",
              description: zh
                ? "链接已复制到剪贴板。"
                : "The link is on your clipboard.",
            })
          }
        >
          {zh ? "显示通知" : "Show a toast"}
        </Button>
      </Toaster>
    </Block>
  );
}

function CommandPalette({ zh }: { zh: boolean }) {
  return (
    <Block title={zh ? "命令面板" : "Command palette"}>
      <Command className="rounded-3xl">
        <CommandInput placeholder={zh ? "搜索命令…" : "Search commands…"} />
        <CommandList>
          <CommandEmpty>{zh ? "没有结果" : "No results"}</CommandEmpty>
          <CommandGroup heading={zh ? "建议" : "Suggestions"}>
            <CommandItem>
              <CalendarIcon />
              {zh ? "日历" : "Calendar"}
            </CommandItem>
            <CommandItem>
              <SearchIcon />
              {zh ? "搜索文件" : "Search files"}
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <SettingsIcon />
              {zh ? "设置" : "Settings"}
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </Block>
  );
}

function Share({ zh }: { zh: boolean }) {
  const labels = {
    copied: zh ? "已复制" : "Copied",
    failed: zh ? "复制失败，请手动复制" : "Copy failed. Copy manually.",
  };
  return (
    <Block title={zh ? "玻璃中的内容" : "Content inside glass"}>
      <Panel className="grid gap-3">
        <div>
          <p className="font-medium text-sm">
            {zh ? "共享文档" : "Share document"}
          </p>
          <p className="text-muted-foreground text-sm">
            {zh
              ? "复制组件在玻璃中保持普通内容样式。"
              : "Copy components stay ordinary content inside glass."}
          </p>
        </div>
        <ClipboardText
          text="https://sui.dev/s/coastline"
          labels={{ ...labels, copy: zh ? "复制共享链接" : "Copy share link" }}
        />
        <p className="text-sm">
          {zh ? "邀请码 " : "Invite code "}
          <InlineCopyText
            labels={{ ...labels, copy: zh ? "复制邀请码" : "Copy invite code" }}
          >
            COAST-2026
          </InlineCopyText>
        </p>
      </Panel>
    </Block>
  );
}

// Fields on their own in a glass scope are glass, like iOS search fields;
// inside a glass panel they stay ordinary.
function Forms({ zh }: { zh: boolean }) {
  const [page, setPage] = useState(2);
  return (
    <Block title={zh ? "搜索与表单" : "Search and forms"}>
      <div className="grid gap-3">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={zh ? "搜索" : "Search"}
            placeholder={zh ? "搜索" : "Search"}
          />
        </InputGroup>
        <div className="grid grid-cols-2 gap-3">
          <Input
            aria-label={zh ? "名称" : "Name"}
            defaultValue={zh ? "海岸计划" : "Coastline"}
          />
          <Select
            items={fruits.map((value) => ({ value, label: value }))}
            defaultValue="Blueberry"
          >
            <SelectTrigger
              className="w-full"
              aria-label={zh ? "水果" : "Fruit"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fruits.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TagInput
          defaultValue={zh ? ["设计", "工程"] : ["design", "engineering"]}
          placeholder={zh ? "添加标签…" : "Add a tag…"}
          labels={{ input: zh ? "标签" : "Tags" }}
        />
        <ClipboardText
          text="bun add @workspace/ui"
          labels={{ copy: zh ? "复制安装命令" : "Copy install command" }}
        />
        <SensitiveInput
          aria-label={zh ? "访问令牌" : "Access token"}
          defaultValue="sk-live-coastline-2026"
        />
        <Textarea
          aria-label={zh ? "备注" : "Notes"}
          placeholder={zh ? "写点什么…" : "Write something…"}
        />
        <Pagination
          page={page}
          onPageChange={setPage}
          perPage={10}
          totalCount={48}
          controls="full"
          className="justify-center"
        >
          <PaginationControls />
        </Pagination>
      </div>
    </Block>
  );
}

const photos = [
  "from-amber-300 via-orange-400 to-rose-500",
  "from-sky-300 via-blue-500 to-indigo-600",
  "from-emerald-300 via-teal-500 to-cyan-600",
];

// Carousel controls float over the photos as glass; the slides stay content.
function Photos({ zh }: { zh: boolean }) {
  return (
    <Block title={zh ? "照片" : "Photos"}>
      <Carousel opts={{ loop: true }}>
        <CarouselContent>
          {photos.map((gradient, index) => (
            <CarouselItem key={gradient}>
              <div
                role="img"
                aria-label={`${zh ? "照片" : "Photo"} ${index + 1}`}
                className={`aspect-[4/3] rounded-3xl bg-linear-to-br ${gradient}`}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="start-3" />
        <CarouselNext className="end-3" />
      </Carousel>
    </Block>
  );
}

// Cards and QR codes are content; glass is an explicit opt-in for widgets.
function Widgets({ zh, glass }: { zh: boolean; glass: boolean }) {
  return (
    <Block title={zh ? "小组件" : "Widgets"}>
      {/* The code is a square as tall as the card beside it. */}
      <div className="grid grid-cols-[1fr_auto] items-stretch gap-3">
        <Card glass={glass} size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CloudSunIcon className="size-4" />
              {zh ? "上海" : "Shanghai"}
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">24°</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {zh ? "多云，最高 27° 最低 19°" : "Cloudy · H 27° L 19°"}
          </CardContent>
        </Card>
        <QRCode
          glass={glass}
          value="https://sui.dev"
          size={160}
          label={zh ? "打开 SUI" : "Open SUI"}
          className="h-full rounded-2xl"
          style={{ width: "auto" }}
        />
      </div>
    </Block>
  );
}

export function GlassLabBlocks({
  locale,
  glass = true,
}: ExampleProps & { glass?: boolean }) {
  const zh = locale === "zh-CN";
  return (
    <>
      <NowPlaying zh={zh} />
      <ControlCenter zh={zh} />
      <Navigation zh={zh} />
      <Popups zh={zh} />
      <Editing zh={zh} />
      <Notifications zh={zh} />
      <Overlays zh={zh} />
      <CommandPalette zh={zh} />
      <Share zh={zh} />
      <Widgets zh={zh} glass={glass} />
      <Photos zh={zh} />
      <Forms zh={zh} />
    </>
  );
}
