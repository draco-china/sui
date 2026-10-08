import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
window.document.write("<!doctype html><html><head></head><body></body></html>");
Object.defineProperty(window.document, "compatMode", {
  value: "CSS1Compat",
  configurable: true,
});
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  HTMLIFrameElement: window.HTMLIFrameElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Element: window.Element,
  Node: window.Node,
  DocumentFragment: window.DocumentFragment,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const { act, createRef, useEffect, useRef, useState } = await import("react");
const liveModels = new Set<string>();
const disposedModels: string[] = [];
type ScrollEditor = {
  scrollTop: number;
  getScrollHeight: () => number;
  getLayoutInfo: () => { height: number };
  getScrollTop: () => number;
  setScrollTop: (value: number) => void;
  onDidScrollChange: (callback: () => void) => { dispose: () => void };
};
const editorScrollListeners = new Map<ScrollEditor, () => void>();
let mountedEditor: ScrollEditor | null = null;
function scrollEditor(): ScrollEditor {
  const instance: ScrollEditor = {
    scrollTop: 0,
    getScrollHeight: () => 1000,
    getLayoutInfo: () => ({ height: 200 }),
    getScrollTop: () => instance.scrollTop,
    setScrollTop: (value) => {
      instance.scrollTop = value;
    },
    onDidScrollChange: (callback) => {
      editorScrollListeners.set(instance, callback);
      return { dispose: () => editorScrollListeners.delete(instance) };
    },
  };
  return instance;
}
const { createRoot } = await import("react-dom/client");
mock.module("../../../../packages/ui/src/lib/editor/monaco-client.tsx", () => ({
  default: function MonacoBridge({
    value,
    path,
    language,
    onChange,
    onMount,
  }: {
    value: string;
    path: string;
    language: string;
    onChange: (value: string) => void;
    onMount?: (editor: ScrollEditor, monaco: object) => void;
  }) {
    const currentPath = useRef(path);
    const instance = useRef(scrollEditor());
    useEffect(() => {
      mountedEditor = instance.current;
      onMount?.(instance.current, {});
      return () => {
        editorScrollListeners.delete(instance.current);
      };
    }, []);
    useEffect(() => {
      liveModels.add(path);
      currentPath.current = path;
    }, [path]);
    // The React Monaco bridge disposes its current model on unmount; it retains
    // previously visited paths when its path prop changes without unmounting.
    useEffect(
      () => () => {
        disposedModels.push(currentPath.current);
        liveModels.delete(currentPath.current);
      },
      [],
    );
    return (
      <div>
        <span data-editor-value>{value}</span>
        <span data-editor-language>{language}</span>
        <button type="button" onClick={() => onChange("edited")}>
          Simulate Monaco edit
        </button>
      </div>
    );
  },
}));
const { Editor } = await import("@workspace/ui/components/editor");
const { CodeViewer } = await import("@workspace/ui/components/code-viewer");
const { DiffViewer } = await import("@workspace/ui/components/diff-viewer");
const { useStreamingScroll } = await import(
  "../../../../packages/ui/src/hooks/use-viewer-code"
);
const { useFullscreen } = await import(
  "../../../../packages/ui/src/hooks/use-fullscreen"
);
const host = window.document.createElement("div");
window.document.body.append(host);
const root = createRoot(host);
async function render(node: Parameters<typeof root.render>[0]) {
  await act(async () => {
    root.render(node);
    await Bun.sleep(30);
  });
}
async function click(button: HTMLElement | null | undefined) {
  assert(button);
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await Bun.sleep(15);
  });
}
function button(label: string) {
  return [...host.querySelectorAll<HTMLElement>("button")].find(
    (node) =>
      node.textContent === label || node.getAttribute("aria-label") === label,
  );
}
const changes: string[] = [];
await render(
  <Editor
    defaultValue="draft"
    language="html"
    height={280}
    fullscreen={false}
    onChange={(value) => changes.push(value)}
  />,
);
await click(button("Simulate Monaco edit"));
assert.equal(host.querySelector("[data-editor-value]")?.textContent, "edited");
assert.deepEqual(changes, ["edited"]);
await click(button("Preview"));
assert.equal(
  host.querySelector("iframe")?.getAttribute("sandbox"),
  "allow-same-origin",
);
assert.equal(host.querySelector("iframe")?.getAttribute("srcdoc"), "edited");
await click(button("Hide preview"));
assert(host.querySelector("[data-editor-value]"));
await render(
  <Editor
    value="controlled"
    language="html"
    height={280}
    fullscreen={false}
    onChange={(value) => changes.push(value)}
  />,
);
await click(button("Simulate Monaco edit"));
assert.equal(
  host.querySelector("[data-editor-value]")?.textContent,
  "controlled",
);
assert.equal(changes.at(-1), "edited");
const beforeDisabled = changes.length;
await render(
  <Editor
    value="controlled"
    disabled
    language="html"
    height={280}
    fullscreen={false}
    onChange={(value) => changes.push(value)}
  />,
);
await click(button("Simulate Monaco edit"));
assert.equal(changes.length, beforeDisabled);
const languageChanges: string[] = [];
function LanguageEditor({ disabled = false }: { disabled?: boolean }) {
  const [language, setLanguage] = useState("markdown");
  return (
    <Editor
      value="document stays intact"
      language={language}
      onLanguageChange={(next) => {
        languageChanges.push(next);
        setLanguage(next);
      }}
      disabled={disabled}
      languages={[
        { value: "md", label: "Markdown" },
        { value: "html", label: "HTML" },
        { value: "ts", label: "TypeScript" },
        { value: "typescript", label: "Duplicate TypeScript" },
        { value: "tsx", label: "TSX" },
        { value: "json", label: "JSON" },
      ]}
      fullscreen={false}
    />
  );
}
async function selectLanguage(label: string, expectedCount?: number) {
  await click(button("Language"));
  if (expectedCount !== undefined)
    assert.equal(
      window.document.querySelectorAll('[role="option"]').length,
      expectedCount,
      "normalized aliases cannot create duplicate language choices",
    );
  const option = [
    ...window.document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((node) => node.textContent === label);
  assert(option);
  await act(async () => {
    option.dispatchEvent(
      new window.PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
      }),
    );
    option.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, detail: 1 }),
    );
    await Bun.sleep(30);
  });
}
await render(<LanguageEditor />);
await selectLanguage("HTML", 5);
assert.equal(languageChanges.at(-1), "html");
assert(
  host.querySelector("[data-editor-value]")?.textContent ===
    "document stays intact",
);
await click(button("Preview"));
assert.equal(
  host.querySelector("iframe")?.getAttribute("srcdoc"),
  "document stays intact",
);
await selectLanguage("TypeScript");
assert.equal(languageChanges.at(-1), "typescript");
assert.equal(
  host.querySelector("iframe"),
  null,
  "a language without built-in preview returns to editing",
);
assert.equal(
  host.querySelector("[data-editor-value]")?.textContent,
  "document stays intact",
);
await selectLanguage("TSX");
assert.equal(languageChanges.at(-1), "tsx");
assert.equal(
  host.querySelector("[data-editor-language]")?.textContent,
  "tsx",
  "the editor bridge receives the original TSX grammar ID",
);
assert.equal(liveModels.size, 1);
assert([...liveModels][0].endsWith(".tsx"));
await selectLanguage("JSON");
assert.equal(languageChanges.at(-1), "json");
await render(<LanguageEditor disabled />);
assert.equal(button("Language")?.getAttribute("disabled"), "");
await render(<Editor language="typescript" fullscreen={false} />);
assert.equal(
  button("Language"),
  undefined,
  "without a callback the language picker is hidden",
);
await render(
  <Editor
    language="typescript"
    onLanguageChange={() => {}}
    toolbarLanguage={false}
    fullscreen={false}
  />,
);
assert.equal(
  button("Language"),
  undefined,
  "toolbarLanguage explicitly hides selection",
);
const requests: string[] = [];
await render(
  <Editor
    language="  TS  "
    onLanguageChange={(next) => requests.push(next)}
    fullscreen={false}
  />,
);
await selectLanguage("HTML");
assert.deepEqual(requests, ["html"]);
assert.equal(
  button("Language")?.querySelector('[data-slot="select-value"]')?.textContent,
  "TypeScript",
  "the caller must acknowledge a controlled language change",
);

await render(
  <Editor
    value="const node = <div />;"
    language="typescript"
    height={280}
    fullscreen={false}
  />,
);
assert.equal(liveModels.size, 1);
const typeScriptModel = [...liveModels][0];
assert(typeScriptModel.endsWith(".ts"));
await render(
  <Editor
    value="const node = <div />;"
    language="tsx"
    height={280}
    fullscreen={false}
  />,
);
assert(
  disposedModels.includes(typeScriptModel),
  "switching TypeScript to TSX must unmount the old Monaco bridge and dispose its model",
);
assert.equal(
  liveModels.size,
  1,
  "language changes cannot leave an old URI model alive",
);
assert([...liveModels][0].endsWith(".tsx"));
assert.equal(
  host.querySelector("[data-editor-value]")?.textContent,
  "const node = <div />;",
);

await render(
  <Editor
    value="<p>First document</p>"
    language="html"
    height={280}
    fullscreen={false}
  />,
);
await click(button("Split"));
const htmlFrame = host.querySelector("iframe");
assert(htmlFrame);
assert.equal(htmlFrame.getAttribute("sandbox"), "allow-same-origin");
assert(!htmlFrame.getAttribute("sandbox")?.includes("allow-scripts"));
function previewDoc(height: number) {
  const inner = new HappyWindow();
  inner.document.write(
    "<!doctype html><html><body><p>Document</p></body></html>",
  );
  const element = inner.document.documentElement;
  Object.defineProperty(inner.document, "scrollingElement", { value: element });
  Object.defineProperties(element, {
    scrollHeight: { value: height },
    clientHeight: { value: 200 },
    scrollTop: { value: 0, writable: true },
  });
  return { inner, element };
}
const firstDoc = previewDoc(1400);
Object.defineProperty(htmlFrame, "contentDocument", {
  value: firstDoc.inner.document,
  configurable: true,
});
await act(async () => {
  htmlFrame.dispatchEvent(new window.Event("load"));
});
assert(mountedEditor);
const synchronizedEditor = mountedEditor as ScrollEditor;
await act(async () => {
  synchronizedEditor.scrollTop = 200;
  editorScrollListeners.get(synchronizedEditor)?.();
  await Bun.sleep(30);
});
assert.equal(
  firstDoc.element.scrollTop,
  300,
  "Monaco scrolling updates the HTML document proportionally",
);
await act(async () => {
  firstDoc.element.scrollTop = 600;
  firstDoc.inner.document.dispatchEvent(new firstDoc.inner.Event("scroll"));
  await Bun.sleep(30);
});
assert.equal(
  synchronizedEditor.scrollTop,
  400,
  "HTML document scrolling updates Monaco proportionally",
);
await render(
  <Editor
    value="<p>Replacement document</p>"
    language="html"
    height={280}
    fullscreen={false}
  />,
);
const secondDoc = previewDoc(1800);
Object.defineProperty(htmlFrame, "contentDocument", {
  value: secondDoc.inner.document,
  configurable: true,
});
await act(async () => htmlFrame.dispatchEvent(new window.Event("load")));
await act(async () => {
  synchronizedEditor.scrollTop = 200;
  editorScrollListeners.get(synchronizedEditor)?.();
  await Bun.sleep(30);
});
assert.equal(
  secondDoc.element.scrollTop,
  400,
  "a replaced iframe document becomes the new scroll target",
);
await act(async () => {
  firstDoc.element.scrollTop = 1100;
  firstDoc.inner.document.dispatchEvent(new firstDoc.inner.Event("scroll"));
});
assert.equal(
  synchronizedEditor.scrollTop,
  200,
  "old iframe document listeners are removed after replacement",
);

await render(
  <DiffViewer
    oldCode={"same\nold\n"}
    newCode={"same\nnew\n"}
    copyable={false}
  />,
);
await act(async () => {
  secondDoc.element.scrollTop = 1200;
  secondDoc.inner.document.dispatchEvent(new secondDoc.inner.Event("scroll"));
});
assert.equal(
  synchronizedEditor.scrollTop,
  200,
  "iframe document listeners are removed when the editor unmounts",
);
await firstDoc.inner.happyDOM.close();
await secondDoc.inner.happyDOM.close();
assert.equal(host.querySelectorAll("table").length, 2);
await click(button("Unified"));
assert.equal(host.querySelectorAll("table").length, 1);
assert.equal(button("Unified")?.getAttribute("aria-pressed"), "true");
const { codeToViewerTokens } = await import(
  "../../../../packages/ui/src/lib/viewer/shiki"
);
async function ready() {
  const started = Date.now();
  while (!host.textContent?.includes("Ready")) {
    if (Date.now() - started > 5000)
      throw new Error("Highlighting did not settle");
    await act(async () => Bun.sleep(10));
  }
}
function contentCells() {
  return [
    ...host.querySelectorAll<HTMLTableCellElement>("tbody tr td:last-child"),
  ];
}
function tokenPairs(cell: HTMLElement) {
  return [...cell.querySelectorAll<HTMLSpanElement>("span")].map((node) => [
    node.textContent,
    node.style.color,
  ]);
}
function expectedPairs(tokens: { content: string; color?: string }[]) {
  return tokens.map((token) => {
    const span = window.document.createElement("span");
    span.style.color = token.color ?? "";
    return [token.content, span.style.color];
  });
}
await ready();
for (const [oldCode, newCode] of [
  ["const value = `old\nshared\n`;", 'const value = "new";\nshared\n`;'],
  ["/* old\nshared\n*/", "const ready = true;\nshared\n*/"],
]) {
  const oldTokens = await codeToViewerTokens(oldCode, "typescript", "light");
  const newTokens = await codeToViewerTokens(newCode, "typescript", "light");
  await render(
    <DiffViewer oldCode={oldCode} newCode={newCode} copyable={false} />,
  );
  await click(button("Split"));
  await ready();
  const shared = contentCells().filter((cell) => cell.textContent === "shared");
  assert.equal(shared.length, 2);
  assert.deepEqual(
    tokenPairs(shared[0]),
    expectedPairs(oldTokens[1]),
    "the old pane retains its multiline lexical context",
  );
  assert.deepEqual(
    tokenPairs(shared[1]),
    expectedPairs(newTokens[1]),
    "the new pane has its independent lexical context",
  );
  await click(button("Unified"));
  const firstNew = contentCells().find(
    (cell) => cell.textContent === newCode.split("\n")[0],
  );
  assert(firstNew);
  assert.deepEqual(
    tokenPairs(firstNew),
    expectedPairs(newTokens[0]),
    "added code is never tokenized inside removed strings or comments",
  );
  const unchanged = contentCells().find(
    (cell) => cell.textContent === "shared",
  );
  assert(unchanged);
  assert.deepEqual(tokenPairs(unchanged), expectedPairs(newTokens[1]));
}
await render(
  <DiffViewer
    oldCode="const old = 1;"
    newCode="const partial = 2;"
    status="streaming"
    copyable={false}
  />,
);
await render(
  <DiffViewer
    oldCode="const old = 1;"
    newCode="const current = 3;"
    status="streaming"
    copyable={false}
  />,
);
await render(
  <DiffViewer
    oldCode="const old = 1;"
    newCode="const final = 4;"
    status="complete"
    copyable={false}
  />,
);
await ready();
assert(!host.textContent?.includes("partial"));
assert(!host.textContent?.includes("current"));
const finalCell = contentCells().find(
  (cell) => cell.textContent === "const final = 4;",
);
assert(finalCell);
assert.deepEqual(
  tokenPairs(finalCell),
  expectedPairs(
    (await codeToViewerTokens("const final = 4;", "typescript", "light"))[0],
  ),
  "rapid source updates display only the latest source tokens",
);

await render(
  <CodeViewer code={"function example() {\n  return 42\n}"} copyable={false} />,
);
assert(host.textContent?.includes("return 42"));
await click(button("Collapse"));
assert(!host.textContent?.includes("return 42"));
await click(button("Expand"));
assert(host.textContent?.includes("return 42"));
for (const code of [
  "function example() {\n  const first = 1\n\n  return 42\n}",
  "function example() {\n\n  return 42\n}",
]) {
  await render(<CodeViewer code={code} copyable={false} />);
  await ready();
  assert(host.textContent?.includes("return 42"));
  await click(button("Collapse"));
  assert(
    !host.textContent?.includes("return 42"),
    "blank lines neither suppress nor end a fold",
  );
  assert(host.textContent?.includes("function example() {"));
  assert.equal(
    contentCells().at(-1)?.textContent,
    "}",
    "closing bracket remains outside the folded body",
  );
  await click(button("Expand"));
  assert(host.textContent?.includes("return 42"));
}
await render(
  <CodeViewer
    code={
      "function outer() {\n\n  if (ready) {\n    return 42\n  }\n\n  return 1\n}"
    }
    copyable={false}
  />,
);
await ready();
const nestedCollapse = [
  ...host.querySelectorAll<HTMLButtonElement>('button[aria-label="Collapse"]'),
];
assert.equal(nestedCollapse.length, 2);
await click(nestedCollapse[1]);
assert(!host.textContent?.includes("return 42"));
assert(host.textContent?.includes("return 1"));
await click(button("Collapse"));
assert(!host.textContent?.includes("return 1"));
await click(button("Expand"));
assert(host.textContent?.includes("return 1"));
assert(
  !host.textContent?.includes("return 42"),
  "expanding the outer fold preserves the inner fold",
);
await click(button("Expand"));
assert(host.textContent?.includes("return 42"));
// Hold the real tokenizer so completion is checked while highlighting is pending.
const highlightModule = await import(
  "../../../../packages/ui/src/lib/viewer/shiki"
);
let releaseHighlight: () => void = () => {};
const highlightGate = new Promise<void>((resolve) => {
  releaseHighlight = resolve;
});
mock.module("../../../../packages/ui/src/lib/viewer/shiki", () => ({
  ...highlightModule,
  codeToViewerTokens: async (
    ...args: Parameters<typeof codeToViewerTokens>
  ) => {
    await highlightGate;
    return codeToViewerTokens(...args);
  },
}));
const streamedRows = Array.from(
  { length: 24 },
  (_, index) => `const line${index} = ${index};`,
);
await render(
  <CodeViewer
    code={streamedRows.slice(0, 23).join("\n")}
    status="streaming"
    maxHeight={180}
    copyable={false}
  />,
);
const completedViewport = host.querySelector<HTMLElement>(
  '[data-slot="code-viewer"] > div:last-child',
);
assert(completedViewport);
Object.defineProperties(completedViewport, {
  scrollHeight: {
    get: () => completedViewport.querySelectorAll("tr").length * 20 + 16,
  },
  clientHeight: { value: 180 },
});
completedViewport.scrollTo = (options) => {
  const target =
    typeof options === "object" ? (options.top ?? 0) : (options ?? 0);
  completedViewport.scrollTop = Math.min(
    target,
    completedViewport.scrollHeight - 180,
  );
  completedViewport.dispatchEvent(new window.Event("scroll"));
};
completedViewport.scrollTop = 296;
completedViewport.dispatchEvent(new window.Event("scroll"));
await render(
  <CodeViewer
    code={streamedRows.join("\n")}
    status="complete"
    maxHeight={180}
    copyable={false}
  />,
);
assert.equal(
  completedViewport.querySelectorAll("tr").length,
  24,
  "completion keeps the latest raw rows while tokens are pending",
);
assert.equal(completedViewport.querySelector('[data-slot="skeleton"]'), null);
assert.equal(
  completedViewport.scrollTop,
  316,
  "the final non-streaming commit follows its last added row",
);
assert(completedViewport.textContent?.includes("const line23 = 23;"));
await act(async () => {
  releaseHighlight();
  await Bun.sleep(30);
});
await ready();
assert.equal(completedViewport.scrollTop, 316);
mock.module("../../../../packages/ui/src/lib/viewer/shiki", () => ({
  ...highlightModule,
  codeToViewerTokens,
}));
const nativeRequestFrame = globalThis.requestAnimationFrame;
const nativeCancelFrame = globalThis.cancelAnimationFrame;
const streamFrames = new Map<number, FrameRequestCallback>();
let streamFrameId = 0;
globalThis.requestAnimationFrame = (callback) => {
  const id = ++streamFrameId;
  streamFrames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => {
  streamFrames.delete(id);
};
async function flushStreamFrames() {
  const frames = [...streamFrames.values()];
  streamFrames.clear();
  await act(async () => {
    for (const frame of frames) frame(window.performance.now());
  });
}
const viewportRef = createRef<HTMLDivElement>();
function Stream({
  content,
  streaming = true,
}: {
  content: string;
  streaming?: boolean;
}) {
  useStreamingScroll(viewportRef, content, streaming);
  return <div ref={viewportRef}>{content}</div>;
}
await render(<Stream content="first" />);
await flushStreamFrames();
const viewport = viewportRef.current;
assert(viewport);
let contentHeight = 800;
Object.defineProperties(viewport, {
  scrollHeight: { get: () => contentHeight, configurable: true },
  clientHeight: { value: 200, configurable: true },
});
let follows = 0;
viewport.scrollTo = (options) => {
  follows++;
  const target = Math.min(
    contentHeight - 200,
    typeof options === "object" ? (options.top ?? 0) : (options ?? 0),
  );
  // A browser smooth-scroll intermediate frame is more than 32px off the new bottom.
  viewport.scrollTop =
    typeof options === "object" && options.behavior === "smooth"
      ? (viewport.scrollTop + target) / 2
      : target;
  viewport.dispatchEvent(new window.Event("scroll"));
};
viewport.scrollTop = 600;
viewport.dispatchEvent(new window.Event("scroll"));
contentHeight = 1000;
await render(<Stream content="second" />);
viewport.dispatchEvent(new window.Event("scroll"));
await flushStreamFrames();
assert.equal(follows, 1);
assert.equal(viewport.scrollTop, 800);
contentHeight = 1100;
await render(<Stream content="third" />);
viewport.dispatchEvent(new window.Event("scroll"));
await flushStreamFrames();
assert.equal(
  follows,
  2,
  "continued appends do not mistake programmatic scrolling for a user pause",
);
assert.equal(viewport.scrollTop, 900);
viewport.scrollTop = 0;
viewport.dispatchEvent(new window.Event("scroll"));
contentHeight = 1200;
await render(<Stream content="fourth" />);
await flushStreamFrames();
assert.equal(follows, 2, "manual scrolling away still pauses following");
viewport.scrollTop = 1000;
viewport.dispatchEvent(new window.Event("scroll"));
contentHeight = 1300;
await render(<Stream content="fifth" />);
await flushStreamFrames();
assert.equal(follows, 3);
assert.equal(viewport.scrollTop, 1100);
contentHeight = 1400;
await render(<Stream content="complete" streaming={false} />);
viewport.dispatchEvent(new window.Event("scroll"));
await flushStreamFrames();
assert.equal(follows, 4, "completion still follows the final added content");
assert.equal(viewport.scrollTop, 1200);
viewport.scrollTop = 0;
viewport.dispatchEvent(new window.Event("scroll"));
await render(<Stream content="finished" streaming={false} />);
await flushStreamFrames();
assert.equal(follows, 4);
await render(<Stream content="new session" />);
await flushStreamFrames();
assert.equal(follows, 5, "a new streaming session restores following");
await render(<Stream content="manual Home before scroll notification" />);
viewport.scrollTop = 0;
await flushStreamFrames();
assert.equal(
  follows,
  5,
  "a real upward move cancels the queued follow even before its scroll notification",
);
assert.equal(viewport.scrollTop, 0);
viewport.scrollTop = 1200;
viewport.dispatchEvent(new window.Event("scroll"));
await render(<Stream content="pending last frame" />);
assert.equal(streamFrames.size, 1);
await render(<div>Closed stream</div>);
assert.equal(streamFrames.size, 0, "unmount cancels its pending follow frame");
globalThis.requestAnimationFrame = nativeRequestFrame;
globalThis.cancelAnimationFrame = nativeCancelFrame;
function FixedScreen({ frameLast = false }: { frameLast?: boolean }) {
  const fullscreen = useFullscreen({ mode: "fixed" });
  const outer = (
    <button key="outer" id="fixed-outer" type="button">
      Outer action
    </button>
  );
  const iframe = (
    <iframe key="iframe" id="fixed-frame" title="Keyboard preview" />
  );
  return (
    <>
      <button
        id="enter-fixed"
        type="button"
        onClick={() => fullscreen.setFullscreen(true)}
      >
        Enter fixed
      </button>
      <span data-fixed>{String(fullscreen.fullscreen)}</span>
      <div ref={fullscreen.ref}>
        {frameLast ? [outer, iframe] : [iframe, outer]}
      </div>
    </>
  );
}
function key(owner: Document, name: string, shift = false) {
  const event = new window.KeyboardEvent("keydown", {
    key: name,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  owner.dispatchEvent(event);
  return event;
}
function keyboardPreview() {
  const inner = new HappyWindow();
  inner.document.write(
    '<!doctype html><html><body><button id="inner-first">First</button><button id="inner-last">Last</button></body></html>',
  );
  return inner;
}
await render(<FixedScreen />);
const fixedFrame = host.querySelector<HTMLIFrameElement>("#fixed-frame");
assert(fixedFrame);
const keyboardOne = keyboardPreview();
Object.defineProperty(fixedFrame, "contentDocument", {
  value: keyboardOne.document,
  configurable: true,
});
const enterFixed = host.querySelector<HTMLButtonElement>("#enter-fixed");
assert(enterFixed);
enterFixed.focus();
await click(enterFixed);
assert.equal(host.querySelector("[data-fixed]")?.textContent, "true");
const outerAction = host.querySelector<HTMLButtonElement>("#fixed-outer");
assert(outerAction);
outerAction.focus();
await act(async () => {
  assert(key(window.document, "Tab").defaultPrevented);
});
assert.equal(
  keyboardOne.document.activeElement?.id,
  "inner-first",
  "the last outer action wraps to the first iframe action",
);
fixedFrame.focus();
const firstInnerAction = keyboardOne.document.getElementById("inner-first");
assert(firstInnerAction instanceof keyboardOne.HTMLElement);
firstInnerAction.focus();
await act(async () => {
  assert(
    key(keyboardOne.document as unknown as Document, "Tab", true)
      .defaultPrevented,
  );
});
assert.equal(
  window.document.activeElement,
  outerAction,
  "Shift+Tab at the first iframe action wraps to the outer last action",
);
await render(<FixedScreen frameLast />);
const keyboardTwo = keyboardPreview();
Object.defineProperty(fixedFrame, "contentDocument", {
  value: keyboardTwo.document,
  configurable: true,
});
await act(async () => fixedFrame.dispatchEvent(new window.Event("load")));
fixedFrame.focus();
const lastInnerAction = keyboardTwo.document.getElementById("inner-last");
assert(lastInnerAction instanceof keyboardTwo.HTMLElement);
lastInnerAction.focus();
await act(async () => {
  assert(
    key(keyboardTwo.document as unknown as Document, "Tab").defaultPrevented,
  );
});
assert.equal(
  window.document.activeElement,
  outerAction,
  "Tab at the last iframe action wraps to the first outer action after layout changes",
);
outerAction.focus();
await act(async () => {
  assert(key(window.document, "Tab", true).defaultPrevented);
});
assert.equal(keyboardTwo.document.activeElement?.id, "inner-last");
await act(async () => {
  key(keyboardOne.document as unknown as Document, "Escape");
});
assert.equal(
  host.querySelector("[data-fixed]")?.textContent,
  "true",
  "a replaced iframe document cannot control fullscreen",
);
await act(async () => {
  key(keyboardTwo.document as unknown as Document, "Escape");
});
assert.equal(
  host.querySelector("[data-fixed]")?.textContent,
  "false",
  "Escape inside the current same-origin iframe exits fixed fullscreen",
);
assert.equal(
  window.document.activeElement,
  enterFixed,
  "fullscreen restores the original outer focus",
);
await click(enterFixed);
Object.defineProperty(fixedFrame, "contentDocument", {
  get: () => {
    throw new Error("Cross-origin frame");
  },
  configurable: true,
});
await act(async () => fixedFrame.dispatchEvent(new window.Event("load")));
outerAction.focus();
await act(async () => {
  assert(key(window.document, "Tab", true).defaultPrevented);
});
assert.equal(
  window.document.activeElement,
  fixedFrame,
  "an inaccessible iframe remains one focus entry",
);
await act(async () => root.render(<div>Closed</div>));
await act(async () => {
  key(keyboardTwo.document as unknown as Document, "Escape");
});
assert.equal(
  window.document.body.style.overflow,
  "",
  "unmount releases the fixed viewport scroll lock",
);
await keyboardOne.happyDOM.close();
await keyboardTwo.happyDOM.close();

const stackChanges: string[] = [];
function StackOverlay({ name, revision }: { name: string; revision: number }) {
  const fullscreen = useFullscreen({
    onFullscreenChange: (value) =>
      stackChanges.push(`${name}:${value}:${revision}`),
  });
  return (
    <section>
      <button
        id={`${name}-enter`}
        type="button"
        onClick={() => fullscreen.setFullscreen(true)}
      >
        Enter {name}
      </button>
      <button
        id={`${name}-exit`}
        type="button"
        onClick={() => fullscreen.setFullscreen(false)}
      >
        Exit {name}
      </button>
      <span id={`${name}-state`}>{String(fullscreen.fullscreen)}</span>
      <div ref={fullscreen.ref}>
        <button id={`${name}-first`} type="button">
          First {name}
        </button>
        <button id={`${name}-last`} type="button">
          Last {name}
        </button>
      </div>
    </section>
  );
}
function OverlayStack({
  showA = true,
  showB = true,
  revision = 0,
}: {
  showA?: boolean;
  showB?: boolean;
  revision?: number;
}) {
  return (
    <>
      <button id="stack-outside" type="button">
        Outside
      </button>
      {showA && <StackOverlay key="a" name="a" revision={revision} />}
      {showB && <StackOverlay key="b" name="b" revision={revision} />}
    </>
  );
}
function stackNode(id: string) {
  const node = host.querySelector<HTMLElement>(`#${id}`);
  assert(node);
  return node;
}
window.document.body.style.setProperty("overflow", "scroll", "important");
await render(<OverlayStack />);
stackNode("stack-outside").focus();
await click(stackNode("a-enter"));
stackNode("a-last").focus();
await click(stackNode("b-enter"));
await render(<OverlayStack revision={1} />);
stackNode("b-last").focus();
await act(async () => {
  assert(key(window.document, "Tab").defaultPrevented);
});
assert.equal(
  window.document.activeElement,
  stackNode("b-first"),
  "only the newest overlay traps keyboard focus after callback updates",
);
await act(async () => {
  key(window.document, "Escape");
});
assert.equal(stackNode("a-state").textContent, "true");
assert.equal(stackNode("b-state").textContent, "false");
assert.equal(
  stackChanges.at(-1),
  "b:false:1",
  "keyboard exit uses the latest callback without promoting a lower overlay",
);
assert.equal(
  window.document.activeElement,
  stackNode("a-last"),
  "closing the top overlay restores the previous lower-overlay focus",
);
assert.equal(
  window.document.body.style.overflow,
  "hidden",
  "one overlay exiting cannot release another overlay's scroll lock",
);
await act(async () => {
  key(window.document, "Escape");
});
assert.equal(stackNode("a-state").textContent, "false");
assert.equal(window.document.body.style.overflow, "scroll");
assert.equal(
  window.document.body.style.getPropertyPriority("overflow"),
  "important",
);
assert.equal(
  window.document.activeElement,
  stackNode("stack-outside"),
  "the final overlay restores the document's original focus",
);

stackNode("stack-outside").focus();
await click(stackNode("a-enter"));
await click(stackNode("b-enter"));
const topFocus = window.document.activeElement;
await click(stackNode("a-exit"));
assert.equal(
  window.document.activeElement,
  topFocus,
  "closing a lower overlay cannot steal focus from the top overlay",
);
assert.equal(window.document.body.style.overflow, "hidden");
await act(async () => {
  key(window.document, "Escape");
});
assert.equal(
  window.document.body.style.overflow,
  "scroll",
  "lower-first closing still restores the original overflow only after the final exit",
);
assert.equal(window.document.activeElement, stackNode("stack-outside"));

await click(stackNode("a-enter"));
await click(stackNode("b-enter"));
const focusBeforeLowerUnmount = window.document.activeElement;
await render(<OverlayStack showA={false} revision={2} />);
assert.equal(
  window.document.activeElement,
  focusBeforeLowerUnmount,
  "lower-overlay unmount leaves top focus intact",
);
assert.equal(window.document.body.style.overflow, "hidden");
await act(async () => {
  key(window.document, "Escape");
});
assert.equal(stackNode("b-state").textContent, "false");
assert.equal(window.document.body.style.overflow, "scroll");

await render(<OverlayStack revision={3} />);
stackNode("stack-outside").focus();
await click(stackNode("a-enter"));
stackNode("a-last").focus();
await click(stackNode("b-enter"));
await render(<OverlayStack showB={false} revision={4} />);
assert.equal(stackNode("a-state").textContent, "true");
assert.equal(
  window.document.activeElement,
  stackNode("a-last"),
  "top-overlay unmount returns focus to the surviving overlay",
);
assert.equal(window.document.body.style.overflow, "hidden");
await act(async () => root.render(<div>No overlays</div>));
assert.equal(
  window.document.body.style.overflow,
  "scroll",
  "unmounting the final overlay restores the original document style",
);
assert.equal(
  window.document.body.style.getPropertyPriority("overflow"),
  "important",
);
await render(<OverlayStack showB={false} revision={5} />);
stackNode("stack-outside").focus();
await click(stackNode("a-enter"));
const ownerWindow = new HappyWindow() as unknown as typeof window;
ownerWindow.document.body.style.overflow = "auto";
const ownerOutside = ownerWindow.document.createElement("button");
ownerOutside.textContent = "Outside owner document";
ownerWindow.document.body.append(ownerOutside);
const ownerHost = ownerWindow.document.createElement("div");
ownerWindow.document.body.append(ownerHost);
const ownerRoot = createRoot(ownerHost);
await act(async () =>
  ownerRoot.render(<StackOverlay name="other" revision={0} />),
);
ownerOutside.focus();
await click(ownerHost.querySelector<HTMLButtonElement>("#other-enter"));
assert.equal(ownerWindow.document.body.style.overflow, "hidden");
assert.equal(window.document.body.style.overflow, "hidden");
await act(async () => {
  key(ownerWindow.document, "Escape");
});
assert.equal(
  ownerHost.querySelector("#other-state")?.textContent,
  "false",
  "an owner document receives only its own overlay keyboard events",
);
assert.equal(stackNode("a-state").textContent, "true");
assert.equal(window.document.body.style.overflow, "hidden");
assert.equal(ownerWindow.document.body.style.overflow, "auto");
assert.equal(ownerWindow.document.activeElement, ownerOutside);
await click(ownerHost.querySelector<HTMLButtonElement>("#other-enter"));
await act(async () => root.render(<div>First document closed</div>));
assert.equal(window.document.body.style.overflow, "scroll");
assert.equal(
  ownerWindow.document.body.style.overflow,
  "hidden",
  "releasing one owner document cannot release another document's lock",
);
await act(async () => ownerRoot.unmount());
assert.equal(ownerWindow.document.body.style.overflow, "auto");
assert.equal(ownerWindow.document.activeElement, ownerOutside);
await ownerWindow.happyDOM.abort();

window.document.body.style.removeProperty("overflow");

const fullscreenRef = createRef<HTMLDivElement>();
function Screen({ show }: { show: boolean }) {
  const fullscreen = useFullscreen({ mode: "screen", ref: fullscreenRef });
  return (
    <>
      <button type="button" onClick={() => fullscreen.setFullscreen(true)}>
        Enter screen
      </button>
      <span data-screen>{String(fullscreen.fullscreen)}</span>
      {show && <div ref={fullscreenRef} />}
    </>
  );
}
await render(<Screen show />);
assert(fullscreenRef.current);
Object.defineProperty(window.document, "fullscreenElement", {
  value: null,
  writable: true,
  configurable: true,
});
fullscreenRef.current.requestFullscreen = async () => {
  Object.defineProperty(window.document, "fullscreenElement", {
    value: fullscreenRef.current,
    writable: true,
    configurable: true,
  });
  window.document.dispatchEvent(new window.Event("fullscreenchange"));
};
await click(button("Enter screen"));
assert.equal(host.querySelector("[data-screen]")?.textContent, "true");
await render(<Screen show={false} />);
await act(async () => {
  Object.defineProperty(window.document, "fullscreenElement", {
    value: null,
    writable: true,
    configurable: true,
  });
  window.document.dispatchEvent(new window.Event("fullscreenchange"));
});
assert.equal(host.querySelector("[data-screen]")?.textContent, "false");
await act(async () => root.unmount());
assert.equal(
  liveModels.size,
  0,
  "the final editor unmount releases all owned models",
);
await window.happyDOM.abort();
console.log(
  "editor controlled/uncontrolled/disabled, sandbox preview, diff modes, folds, paused streaming and detached fullscreen passed",
);
