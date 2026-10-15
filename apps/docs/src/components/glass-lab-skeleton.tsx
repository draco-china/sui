import { Skeleton } from "@workspace/ui/components/skeleton";

// Static outlines of the demo's initial state, shared by deferred loading and
// Suspense. Skeleton already uses Regular/CSS; no measurement or GPU capture.
const trigger = {
  className: "flex justify-center",
  parts: { control: "h-9 w-32 rounded-full" },
};
const field = {
  className: "grid w-full max-w-sm gap-3",
  parts: {
    label: "h-4 w-24",
    input: "h-9 w-full rounded-full",
    hint: "h-4 w-3/4",
  },
};
const code = {
  className: "grid w-full gap-3",
  parts: { toolbar: "h-10 w-full", content: "h-52 w-full rounded-xl" },
};

export const glassLabSkeletons: Record<
  string,
  { className: string; parts: Record<string, string> }
> = {
  accordion: {
    className: "grid w-full max-w-lg gap-3",
    parts: {
      open: "h-36 w-full rounded-xl",
      second: "h-11 w-full",
      third: "h-11 w-full",
    },
  },
  "alert-dialog": trigger,
  attachment: {
    className: "grid w-full max-w-sm grid-cols-3 gap-3",
    parts: {
      first: "h-40",
      second: "h-40",
      third: "h-40",
      upload: "col-span-3 h-16",
      file: "col-span-3 h-16",
    },
  },
  autocomplete: field,
  button: {
    className: "flex items-center gap-2",
    parts: { text: "h-9 w-24 rounded-full", icon: "size-9 rounded-full" },
  },
  calendar: {
    className: "grid w-72 max-w-full grid-cols-7 gap-2 p-3",
    parts: {
      header: "col-span-7 h-9",
      weekdays: "col-span-7 h-5",
      week1: "col-span-7 h-9",
      week2: "col-span-7 h-9",
      week3: "col-span-7 h-9",
      week4: "col-span-7 h-9",
      week5: "col-span-7 h-9",
    },
  },
  card: {
    className: "grid w-full max-w-sm gap-5 p-6",
    parts: {
      title: "h-5 w-3/4",
      description: "h-8",
      email: "h-14",
      password: "h-14",
      login: "h-9 rounded-full",
      alternate: "h-9 rounded-full",
    },
  },
  carousel: {
    className: "flex w-full items-center justify-center gap-3 px-3",
    parts: {
      previous: "size-8 shrink-0 rounded-full",
      slide: "aspect-square w-full max-w-xs rounded-xl",
      next: "size-8 shrink-0 rounded-full",
    },
  },
  chart: {
    className: "grid w-full gap-4",
    parts: { header: "h-20 w-full", plot: "h-64 w-full rounded-xl" },
  },
  checkbox: {
    className:
      "grid w-full max-w-sm grid-cols-[1rem_1fr] items-start gap-x-3 gap-y-6",
    parts: {
      first: "size-4 rounded-sm",
      label1: "h-4 w-4/5",
      second: "size-4 rounded-sm",
      label2: "h-14",
      third: "size-4 rounded-sm",
      label3: "h-4 w-3/4",
      fourth: "size-4 rounded-sm",
      label4: "h-14",
    },
  },
  "clipboard-text": {
    className: "flex items-center gap-2",
    parts: { text: "h-5 w-40", copy: "size-8 rounded-full" },
  },
  "code-viewer": code,
  "color-picker": {
    className: "flex gap-2",
    parts: { swatch: "size-9", value: "h-9 w-28" },
  },
  combobox: {
    className: "flex w-full max-w-xs",
    parts: { input: "h-9 w-full rounded-full" },
  },
  command: {
    className: "grid w-full max-w-sm gap-3",
    parts: {
      input: "h-10",
      heading: "h-4 w-24",
      first: "h-9",
      second: "h-9",
      third: "h-9",
      fourth: "h-9",
    },
  },
  "context-menu": {
    className: "w-72 max-w-full",
    parts: { target: "h-36 w-full rounded-xl" },
  },
  dialog: trigger,
  "diff-viewer": {
    className: "grid w-full grid-cols-2 gap-3",
    parts: { toolbar: "col-span-2 h-10", before: "h-44", after: "h-44" },
  },
  drawer: trigger,
  "dropdown-menu": trigger,
  editor: {
    className: "grid w-full gap-3",
    parts: { toolbar: "h-10", content: "h-80 rounded-xl" },
  },
  glass: {
    className: "grid w-full gap-5",
    parts: {
      variants: "h-9",
      count: "h-5 w-24",
      sizes: "h-11 w-3/4",
      input: "h-20",
      error: "h-20",
      disabled: "h-9",
      nested: "h-44 rounded-2xl",
      tinted: "h-20 rounded-2xl",
    },
  },
  "hover-card": trigger,
  "image-viewer": {
    className: "grid w-full grid-cols-3 gap-3",
    parts: {
      first: "aspect-[3/2]",
      second: "aspect-[3/2]",
      third: "aspect-[3/2]",
    },
  },
  "inline-copy-text": {
    className: "flex",
    parts: { text: "h-6 w-52 max-w-full" },
  },
  input: field,
  "input-group": {
    className: "w-full max-w-xs",
    parts: { input: "h-9 rounded-full" },
  },
  "input-otp": {
    className: "grid w-full max-w-sm grid-cols-6 gap-2",
    parts: {
      hint: "col-span-6 h-10",
      digit1: "h-10",
      digit2: "h-10",
      digit3: "h-10",
      digit4: "h-10",
      digit5: "h-10",
      digit6: "h-10",
      status: "col-span-6 h-5",
      actions: "col-span-6 mx-auto h-8 w-48 rounded-full",
    },
  },
  menubar: {
    className: "flex",
    parts: { bar: "h-9 w-64 max-w-full rounded-full" },
  },
  "message-scroller": {
    className: "grid w-full max-w-sm gap-4",
    parts: { conversation: "h-140 rounded-2xl", hint: "h-4" },
  },
  "native-select": { className: "w-48", parts: { select: "h-9 rounded-full" } },
  "navigation-menu": {
    className: "flex",
    parts: { menu: "h-9 w-96 max-w-full rounded-full" },
  },
  pagination: {
    className: "flex",
    parts: { pages: "h-9 w-72 max-w-full rounded-full" },
  },
  popover: trigger,
  questionnaire: {
    className: "grid w-full max-w-md gap-4",
    parts: {
      progress: "h-2",
      title: "h-6",
      description: "h-5 w-4/5",
      choice1: "h-20",
      choice2: "h-20",
      choice3: "h-20",
      input: "h-9 rounded-full",
      actions: "h-9 w-3/4 rounded-full",
    },
  },
  "radio-group": {
    className: "grid grid-cols-[1rem_8rem] items-center gap-3",
    parts: {
      first: "size-4 rounded-full",
      label1: "h-4",
      second: "size-4 rounded-full",
      label2: "h-4",
      third: "size-4 rounded-full",
      label3: "h-4",
    },
  },
  select: { className: "w-48", parts: { select: "h-9 rounded-full" } },
  "sensitive-input": field,
  sheet: trigger,
  slider: {
    className: "w-full max-w-xs",
    parts: { track: "h-2 w-full rounded-full" },
  },
  switch: {
    className: "flex items-center gap-2",
    parts: { switch: "h-5 w-9 rounded-full", label: "h-4 w-28" },
  },
  "tab-bar": { className: "flex", parts: { tabs: "h-14 w-48 rounded-full" } },
  tabs: {
    className: "grid w-full max-w-sm gap-3",
    parts: { tabs: "h-9 rounded-full", panel: "h-48 rounded-xl" },
  },
  "tag-input": field,
  textarea: { className: "w-full", parts: { input: "h-20 w-full rounded-xl" } },
  toast: trigger,
  toggle: { className: "flex", parts: { toggle: "size-9" } },
  "toggle-group": {
    className: "flex flex-wrap items-start justify-center gap-6",
    parts: {
      spaced: "h-9 w-28",
      joined: "h-9 w-28 rounded-full",
      vertical: "h-28 w-9 rounded-full",
    },
  },
  toolbar: {
    className: "flex",
    parts: { toolbar: "h-10 w-80 max-w-full rounded-full" },
  },
  tooltip: {
    className: "flex flex-wrap justify-center gap-3 px-14 py-14",
    parts: {
      top: "h-9 w-16 rounded-full",
      right: "h-9 w-16 rounded-full",
      bottom: "h-9 w-16 rounded-full",
      left: "h-9 w-16 rounded-full",
    },
  },
};

export function GlassLabSkeleton({ slug }: { slug: string }) {
  const preview = glassLabSkeletons[slug];
  if (!preview) return null;
  return (
    <div
      className={preview.className}
      data-lab-skeleton={slug}
      aria-hidden="true"
    >
      {Object.entries(preview.parts).map(([part, className]) => (
        <Skeleton key={part} className={className} />
      ))}
    </div>
  );
}
