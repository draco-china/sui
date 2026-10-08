import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost/docs?preview=1#example",
}) as unknown as Window &
  typeof globalThis & {
    happyDOM: {
      close: () => Promise<void>;
      settings: { device: { prefersReducedMotion: string } };
    };
  };
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  ShadowRoot: window.ShadowRoot,
  SVGElement: window.SVGElement,
  HTMLIFrameElement: window.HTMLIFrameElement,
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
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, {
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
});
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
const requestFrame = (callback: FrameRequestCallback) => {
  const id = ++nextFrame;
  frames.set(id, callback);
  return id;
};
const cancelFrame = (id: number) => {
  frames.delete(id);
};
Object.assign(globalThis, {
  requestAnimationFrame: requestFrame,
  cancelAnimationFrame: cancelFrame,
});
window.requestAnimationFrame = requestFrame;
window.cancelAnimationFrame = cancelFrame;
const listeners = new Set<() => void>();
let reduced = false;
window.matchMedia = (media) =>
  ({
    get matches() {
      return media.includes("prefers-reduced-motion") && reduced;
    },
    media,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  }) as unknown as MediaQueryList;

Object.assign(globalThis, { matchMedia: window.matchMedia });

mock.module("@tanstack/react-router", () => ({
  useParams: () => ({ lang: "zh-CN" }),
}));
const { act, useState, createRef } = await import("react");
const { hydrateRoot } = await import("react-dom/client");
const { renderToString } = await import("react-dom/server");
const { MorphIcon } = await import("@workspace/ui/components/morph-icon");
const genericRef =
  createRef<import("@workspace/ui/components/morph-icon").MorphHandle>();
const { CopyIcon } = await import("@workspace/ui/components/copy-icon");
const { InlineCopyText } = await import(
  "@workspace/ui/components/inline-copy-text"
);
const { ClipboardText } = await import(
  "@workspace/ui/components/clipboard-text"
);
const { SensitiveInput } = await import(
  "@workspace/ui/components/sensitive-input"
);
const { CodeBlock } = await import("../../src/components/code-block");
const { Heading } = await import("../../src/components/heading");
const { MarkdownCopyButton } = await import(
  "../../src/components/markdown-copy-button"
);
const writes: string[] = [];
let resolveWrite: () => void = () => {};
let rejectWrite: (reason: Error) => void = () => {};
let deferred = false;
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: (value: string) => {
      writes.push(value);
      if (!deferred) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        resolveWrite = resolve;
        rejectWrite = reject;
      });
    },
  },
});
const fetches: string[] = [];
let fetchStatus = 200;
let delayFetch = false;
let requestSignal: AbortSignal | undefined;
Object.assign(globalThis, {
  fetch: async (url: string, options: RequestInit) => {
    fetches.push(url);
    requestSignal = options.signal as AbortSignal;
    if (delayFetch)
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Cancelled", "AbortError")),
          { once: true },
        );
      });
    return new Response("# Full Markdown\n\nFull body with examples.", {
      status: fetchStatus,
    });
  },
});
let updateState: (state: "idle" | "copied" | "error" | "pending") => void =
  () => {};
let updateUrl: (url: string) => void = () => {};
function Example() {
  const [state, setState] = useState<"idle" | "copied" | "error" | "pending">(
    "idle",
  );
  const [url, setUrl] = useState("/markdown/a");
  updateState = setState;
  updateUrl = setUrl;
  return (
    <form
      onSubmit={() => {
        throw new Error("copy submitted form");
      }}
    >
      <MorphIcon id="generic" ref={genericRef} icon="M2 2L22 22" />
      <CopyIcon id="geometry" status={state} size={22} strokeWidth={1.65} />
      <InlineCopyText value="full inline value" iconVisibility="always">
        Visible
      </InlineCopyText>
      <ClipboardText
        text="visible clipboard value"
        textToCopy="full clipboard value"
      />
      <SensitiveInput defaultValue="private value" />
      <CodeBlock
        title="example.ts"
        Actions={({ className, children }) => (
          <div className={className}>
            <span>Custom toolbar</span>
            {children}
          </div>
        )}
      >
        <pre>
          <code>
            first<span className="nd-copy-ignore">hidden</span>second
          </code>
        </pre>
      </CodeBlock>
      <Heading as="h2" id="section">
        Copy heading
      </Heading>
      <MarkdownCopyButton markdownUrl={url} locale="zh-CN" />
    </form>
  );
}
const host = document.createElement("div");
document.body.append(host);
host.innerHTML = renderToString(<Example />);
const errors: unknown[] = [];
let root: ReturnType<typeof hydrateRoot>;
await act(async () => {
  root = hydrateRoot(host, <Example />, {
    onRecoverableError: (error) => errors.push(error),
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
});
assert.deepEqual(errors, []);
async function interaction(callback: () => void) {
  await act(async () => {
    callback();
    await new Promise((resolve) => setTimeout(resolve, 15));
  });
}
async function frame(time: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of callbacks) callback(time);
  });
}
let clock = 100;
async function settle() {
  for (let i = 0; i < 120 && frames.size; i++) {
    clock += 16;
    await frame(clock);
  }
}
const generic = document.querySelector("#generic");
assert.ok(generic);
assert.equal(generic.getAttribute("width"), "16");
assert.equal(generic.getAttribute("stroke-width"), "2");
assert.equal(typeof genericRef.current?.morphTo, "function");
const genericPath = generic.querySelector("path");
const initialGeneric = genericPath?.getAttribute("d");
genericRef.current?.morphTo("M22 2L2 22");
await settle();
assert.notEqual(genericPath?.getAttribute("d"), initialGeneric);
genericRef.current?.set("M2 2L22 22");
assert.equal(genericPath?.getAttribute("d"), initialGeneric);
const svg = document.querySelector("#geometry");
assert.ok(svg);
const path = svg.querySelector("path");
assert.ok(path);
assert.equal(svg.getAttribute("width"), "22");
assert.equal(svg.getAttribute("stroke-width"), "1.65");
assert.equal(svg.querySelectorAll("path").length, 1);
const copyPath = path.getAttribute("d");
await interaction(() => updateState("copied"));
clock += 16;
await frame(clock);
clock += 16;
await frame(clock);
const intermediate = path.getAttribute("d");
assert.notEqual(intermediate, copyPath, "copy/check changes geometric d");
await settle();
const checkPath = path.getAttribute("d");
assert.notEqual(
  intermediate,
  checkPath,
  "a sampled frame differs from both endpoints",
);
assert.equal(
  document.querySelector("#geometry path"),
  path,
  "the same SVG path survives the transition",
);
await interaction(() => updateState("idle"));
clock += 16;
await frame(clock);
clock += 16;
await frame(clock);
const interrupted = path.getAttribute("d");
await interaction(() => updateState("copied"));
assert.equal(
  path.getAttribute("d"),
  interrupted,
  "interruption keeps the current shape",
);
await settle();
assert.equal(path.getAttribute("d"), checkPath);
reduced = true;
for (const listener of listeners) listener();
await interaction(() => updateState("idle"));
assert.equal(
  path.getAttribute("d"),
  copyPath,
  "reduced motion immediately returns to copy",
);
await interaction(() => updateState("error"));
assert.notEqual(path.getAttribute("d"), copyPath);
assert.equal(svg.getAttribute("data-copy-state"), "error");
assert.equal(document.querySelector("#geometry path"), path);
function button(selector: string) {
  const found = document.querySelector(selector);
  assert.ok(found);
  return found as HTMLButtonElement;
}
deferred = true;
const inline = button('[data-slot="inline-copy-text"]');
const inlinePath = inline.querySelector("svg path");
await interaction(() => inline.click());
assert.equal(inline.getAttribute("aria-busy"), "true");
assert.equal(inline.disabled, true);
await interaction(() => inline.click());
assert.equal(writes.filter((value) => value === "full inline value").length, 1);
await interaction(resolveWrite);
assert.equal(inline.getAttribute("data-copy-status"), "copied");
assert.equal(inline.querySelector("svg path"), inlinePath);
const clipboard = button('[data-slot="clipboard-text"] button');
await interaction(() => clipboard.click());
assert.equal(writes.at(-1), "full clipboard value");
await interaction(() => rejectWrite(new Error("No clipboard permission")));
assert.equal(
  clipboard
    .querySelector('[data-copy-state="error"]')
    ?.getAttribute("data-slot"),
  "copy-icon",
);
deferred = false;
const sensitive = button('[data-slot="sensitive-input-copy"]');
await interaction(() => sensitive.click());
assert.equal(writes.at(-1), "private value");
assert.equal(
  sensitive
    .querySelector('[data-copy-state="copied"]')
    ?.getAttribute("data-slot"),
  "copy-icon",
);
const codeCopy = button('figure button[aria-label="复制代码"]');
await interaction(() => codeCopy.click());
assert.equal(writes.at(-1), "first\nsecond");
assert.equal(
  codeCopy
    .querySelector('[data-copy-state="copied"]')
    ?.getAttribute("data-slot"),
  "copy-icon",
);
assert.ok(
  document.querySelector("figure")?.textContent?.includes("Custom toolbar"),
);
const heading = button('button[aria-label="复制标题链接"]');
const headingPath = heading.querySelector("svg path");
await interaction(() => heading.click());
assert.equal(writes.at(-1), "http://localhost/docs?preview=1#section");
assert.equal(heading.querySelector("svg path"), headingPath);
assert.equal(
  heading
    .querySelector('[data-copy-state="copied"]')
    ?.getAttribute("data-slot"),
  "copy-icon",
);
const markdown = button('button[aria-label="复制 Markdown"]');
await interaction(() => markdown.click());
assert.equal(writes.at(-1), "# Full Markdown\n\nFull body with examples.");
assert.equal(
  markdown
    .querySelector('[data-copy-state="copied"]')
    ?.getAttribute("data-slot"),
  "copy-icon",
);
await interaction(() => updateUrl("/markdown/b"));
fetchStatus = 500;
await interaction(() => markdown.click());
assert.equal(markdown.getAttribute("aria-label"), "复制失败");
assert.equal(
  markdown
    .querySelector('[data-copy-state="error"]')
    ?.getAttribute("data-slot"),
  "copy-icon",
);
fetchStatus = 200;
delayFetch = true;
await interaction(() => updateUrl("/markdown/c"));
await interaction(() => markdown.click());
assert.equal(markdown.disabled, true);
assert.equal(markdown.getAttribute("aria-busy"), "true");
await interaction(() => markdown.click());
assert.equal(fetches.filter((url) => url === "/markdown/c").length, 1);
await interaction(() => updateUrl("/markdown/d"));
assert.equal(requestSignal?.aborted, true);
assert.equal(markdown.getAttribute("aria-label"), "复制 Markdown");
assert.equal(markdown.disabled, false);
await interaction(() => markdown.click());
const detachedPath = path.getAttribute("d");
await interaction(() => root.unmount());
assert.equal(requestSignal?.aborted, true);
await settle();
assert.equal(frames.size, 0);
assert.equal(listeners.size, 0);
assert.equal(
  path.getAttribute("d"),
  detachedPath,
  "unmounted SVG is no longer updated",
);
await window.happyDOM.close();
console.log(
  "Copy SVG morphs, clipboard integration, Markdown fetching and cleanup passed",
);
