import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { scenario } from "../support/scenario";
import { cssForHappyDOM } from "./css-color";

const window = new Window({ url: "http://localhost" });
const document = window.document;
const observers: { disconnected: boolean }[] = [];
class Observer {
  disconnected = false;
  constructor(_callback: unknown) {
    observers.push(this);
  }
  observe(_element: unknown) {}
  unobserve(_element: unknown) {}
  disconnect() {
    this.disconnected = true;
  }
}
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
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  MutationObserver: window.MutationObserver,
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
  getComputedStyle: window.getComputedStyle.bind(window),
  innerWidth: 1024,
  innerHeight: 768,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
// happy-dom cannot paint SVG backdrops, so every attempt falls back to CSS.
let svgAttempts = 0;
mock.module("../../../../packages/ui/src/lib/glass/svg-renderer", () => ({
  SvgGlassRenderer: {
    create: async () => {
      svgAttempts++;
      throw new Error("No SVG backdrop filters");
    },
  },
}));
// Reduced transparency keeps the CSS material without requesting SVG.
let reducedTransparency = true;
const matchMedia = window.matchMedia.bind(window);
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) =>
    query.includes("prefers-reduced-transparency")
      ? { ...matchMedia(query), matches: reducedTransparency }
      : matchMedia(query),
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value: (type: string) => {
    if (type !== "2d") return null;
    return {
      fillStyle: "#ffffff",
      fillRect() {},
      clearRect() {},
      getImageData() {
        const rgb = this.fillStyle.match(/^rgba?\(([^)]+)\)$/)?.[1];
        if (rgb) {
          const channels = rgb.split(",").map(Number);
          return {
            data: new Uint8Array([
              channels[0],
              channels[1],
              channels[2],
              (channels[3] ?? 1) * 255,
            ]),
          };
        }
        if (/^#[a-f\d]{6}$/i.test(this.fillStyle)) {
          const channels =
            this.fillStyle
              .slice(1)
              .match(/../g)
              ?.map((channel) => Number.parseInt(channel, 16)) ?? [];
          return { data: new Uint8Array([...channels, 255]) };
        }
        return { data: new Uint8Array([255, 255, 255, 255]) };
      },
    };
  },
});
Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  value() {
    return new window.DOMRect(20, 20, 120, 40);
  },
});
const { act, createRef, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { Button } = await import("@workspace/ui/components/button");
const { Input } = await import("@workspace/ui/components/input");
const { GlassSurface } = await import("@workspace/ui/components/glass");
const { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } =
  await import("@workspace/ui/components/tooltip");
const { acquireGlass, updateGlassConfiguration } = await import(
  "@workspace/ui/lib/glass/runtime"
);
const { glassShadow } = await import("@workspace/ui/lib/glass/edge");
const { parseGlassColor } = await import("@workspace/ui/lib/glass/color");
const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const configuration = {};
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const buttonRef = createRef<HTMLButtonElement>();
const inputRef = createRef<HTMLInputElement>();
const siblingRef = createRef<HTMLButtonElement>();
let clicked = 0;
let submitted = 0;
scenario(
  "glass controls keep native refs and form semantics; the rest stay ordinary",
);
await act(async () => {
  root.render(
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted++;
        }}
      >
        <Button ref={buttonRef} glass type="button" onClick={() => clicked++}>
          Copy
        </Button>
        <Input ref={inputRef} glass name="workspace" defaultValue="Studio" />
        <Button ref={siblingRef} glass type="button">
          Paste
        </Button>
        <Button id="plain" type="button">
          Plain
        </Button>
      </form>
    </div>,
  );
});
assert.equal(
  buttonRef.current?.tagName,
  "BUTTON",
  "glass must preserve the native button ref",
);
assert.equal(
  inputRef.current?.tagName,
  "INPUT",
  "glass must preserve the native input ref",
);
const buttonScope = buttonRef.current?.getAttribute("data-glass-scope");
const siblingScope = siblingRef.current?.getAttribute("data-glass-scope");
assert.ok(buttonScope);
assert.ok(siblingScope);
assert.notEqual(
  buttonScope,
  siblingScope,
  "the same settings retain independent requests",
);
assert.equal(
  inputRef.current?.getAttribute("data-glass"),
  "true",
  "a field with glass is a glass field",
);
assert.equal(inputRef.current?.name, "workspace");
assert.equal(inputRef.current?.value, "Studio");
assert.equal(
  document.getElementById("plain")?.hasAttribute("data-glass"),
  false,
);
await act(async () => {
  buttonRef.current?.click();
});
assert.equal(clicked, 1);
assert.equal(
  submitted,
  0,
  "a type=button glass control cannot submit the surrounding form",
);
scenario(
  "reduced transparency keeps the CSS material and each request's own shading",
);
await pause();
assert.equal(svgAttempts, 0, "reduced transparency does not request SVG");
assert.equal(
  buttonRef.current?.dataset.glassState,
  "css",
  "the CSS material is usable on its own",
);
assert.equal(
  buttonRef.current?.style.getPropertyValue("--glass-initial-edge-shadow"),
  glassShadow([1, 1, 1], [1, 1, 1]),
  "measurement adapts outer shading to the native white surface tint",
);
updateGlassConfiguration({
  ...configuration,
  id: buttonScope,
  strength: 30,
});
await pause();
assert.equal(
  buttonRef.current?.style.getPropertyValue("--glass-initial-edge-shadow"),
  glassShadow([1, 1, 1], [1, 1, 1]),
  "option updates keep the built-in outer shading",
);
assert.match(
  buttonRef.current?.style.getPropertyValue("--glass-edge") ?? "",
  /^url\("data:image\/svg\+xml/,
);
assert.equal(
  siblingRef.current?.style.getPropertyValue("--glass-initial-edge-shadow"),
  glassShadow([1, 1, 1], [1, 1, 1]),
  "updating one independent request does not change its same-configuration sibling",
);
updateGlassConfiguration({ ...configuration, id: buttonScope });
await pause();
assert.equal(
  buttonRef.current?.style.getPropertyValue("--glass-initial-edge-shadow"),
  glassShadow([1, 1, 1], [1, 1, 1]),
);
await act(async () => root.unmount());
assert.equal(buttonRef.current, null);
assert.equal(inputRef.current, null);
assert.ok(observers.every((observer) => observer.disconnected));

scenario("standalone frosted glass stays CSS only while glass requests SVG");
const standaloneRoot = createRoot(host as unknown as HTMLElement);
reducedTransparency = false;
await act(async () => {
  standaloneRoot.render(<Button frosted>Standalone frosted</Button>);
});
await pause();
assert.equal(svgAttempts, 0, "standalone frosted glass stays CSS only");
assert.equal(host.querySelector("button")?.dataset.glassState, undefined);
await act(async () => {
  standaloneRoot.render(<Button glass>Standalone glass</Button>);
});
await pause();
assert.equal(svgAttempts, 1, "standalone glass requests SVG refraction");
assert.equal(host.querySelector("button")?.dataset.glassState, "fallback");
await act(async () => standaloneRoot.unmount());
reducedTransparency = true;

scenario(
  "a Toggle repaints on its pressed state and a controlled Switch keeps an ordinary track",
);
const { Toggle } = await import("@workspace/ui/components/toggle");
const { Switch } = await import("@workspace/ui/components/switch");
const semanticStyle = document.createElement("style");
semanticStyle.textContent = `
  [data-slot="toggle"], [data-slot="switch"] { background-color: rgb(255, 255, 255); }
  [data-slot="toggle"][aria-pressed="true"], [data-slot="switch"][data-checked] { background-color: rgb(0, 88, 204); }
`;
document.head.append(semanticStyle);
const semanticHost = document.createElement("div");
document.body.append(semanticHost);
const semanticRoot = createRoot(semanticHost as unknown as HTMLElement);
const semanticEvents = { input: 0, change: 0 };
semanticHost.addEventListener("input", () => semanticEvents.input++);
semanticHost.addEventListener("change", () => semanticEvents.change++);
const semanticControls = (checked: boolean) => (
  <>
    <Toggle id="semantic-toggle" glass>
      Selected
    </Toggle>
    <Switch id="semantic-switch" checked={checked} glass />
  </>
);
await act(async () => semanticRoot.render(semanticControls(false)));
await act(async () => pause());
const semanticToggle = document.getElementById("semantic-toggle");
const semanticSwitch = semanticHost.querySelector('[data-slot="switch"]');
assert.ok(semanticToggle instanceof window.HTMLButtonElement);
assert.ok(semanticSwitch instanceof window.HTMLElement);
assert.equal(
  semanticToggle.style.getPropertyValue("--glass-base"),
  "rgb(255, 255, 255)",
);
await act(async () => semanticToggle.click());
await act(async () => pause());
assert.equal(semanticToggle.getAttribute("aria-pressed"), "true");
assert.equal(
  semanticToggle.style.getPropertyValue("--glass-base"),
  "rgb(0, 88, 204)",
  "the real Base UI Toggle updates its glass material on pressed attributes alone",
);
await act(async () => semanticRoot.render(semanticControls(true)));
await act(async () => pause());
assert.ok(semanticSwitch.hasAttribute("data-checked"));
assert.equal(semanticSwitch.getAttribute("aria-checked"), "true");
assert.equal(
  semanticSwitch.hasAttribute("data-glass"),
  false,
  "a controlled Switch keeps an ordinary track; only a pressed thumb lifts glass",
);
await act(async () => semanticRoot.render(semanticControls(false)));
await act(async () => pause());
assert.equal(semanticSwitch.getAttribute("aria-checked"), "false");
assert.deepEqual(semanticEvents, { input: 0, change: 0 });
await act(async () => semanticRoot.unmount());
semanticStyle.remove();

scenario(
  "a tooltip trigger stays ordinary while a portaled glass popup owns a surface",
);
const tooltipHost = document.createElement("div");
const beforeTooltip = svgAttempts;
document.body.append(tooltipHost);
const tooltipRoot = createRoot(tooltipHost as unknown as HTMLElement);
await act(async () => {
  tooltipRoot.render(
    <>
      <GlassSurface id="tooltip-parent">
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger
              render={<Button id="tooltip-trigger" type="button" />}
            >
              Help
            </TooltipTrigger>
            <TooltipContent id="tooltip-popup" glass>
              Useful help
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </GlassSurface>
      <GlassSurface id="default-intensity" />
      <GlassSurface id="large-intensity" />
    </>,
  );
});
await act(async () => pause());
for (const id of ["tooltip-parent", "default-intensity", "large-intensity"]) {
  const surface = document.getElementById(id);
  assert.ok(surface instanceof window.HTMLElement);
  assert.equal(surface.dataset.glass, "true");
  assert.equal(surface.dataset.glassIntensity, undefined);
  assert.equal(surface.style.getPropertyValue("--glass-blur"), "");
}

const tooltipParent = document.getElementById("tooltip-parent");
assert.ok(tooltipParent instanceof window.HTMLElement);
assert.equal(tooltipParent.style.getPropertyValue("--glass-blur"), "");
assert.equal(
  document.getElementById("tooltip-trigger")?.hasAttribute("data-glass"),
  false,
  "a trigger without glass stays ordinary",
);
assert.equal(
  document.getElementById("tooltip-popup")?.getAttribute("data-glass"),
  "true",
  "a portaled tooltip owns an independent material surface",
);
assert.equal(
  svgAttempts,
  beforeTooltip,
  "portals under reduced transparency also keep CSS",
);
await act(async () => tooltipRoot.unmount());

scenario("the first read takes the native paint and unhydrated surfaces wait");
const surface = document.createElement("div");
surface.style.backgroundColor = "#ffffff";
surface.dataset.glass = "true";
surface.dataset.glassScope = "leases";
document.body.append(surface);
const initialThemeStyle = document.createElement("style");
initialThemeStyle.textContent =
  ".initial-material { background-color: #161617; } .initial-material[data-glass-state] { background-color: #fff; }";
document.head.append(initialThemeStyle);
surface.style.removeProperty("background-color");
surface.className = "initial-material";
const nativeMaterial = window.getComputedStyle(surface).backgroundColor;
surface.dataset.glassState = "loading";
assert.notEqual(
  window.getComputedStyle(surface).backgroundColor,
  nativeMaterial,
);
const initialRelease = acquireGlass({
  id: "leases",
  tintOpacity: 0,
});
assert.deepEqual(
  parseGlassColor(surface.style.getPropertyValue("--glass-base")),
  parseGlassColor(nativeMaterial),
  "initial glass must read the native dark background instead of the decorated material",
);
assert.equal(surface.style.getPropertyValue("--glass-blur"), "");
assert.equal(surface.style.getPropertyValue("--glass-opacity"), "0%");
initialRelease();
initialThemeStyle.remove();
const pendingSurface = document.createElement("div");
pendingSurface.dataset.glass = "true";
pendingSurface.dataset.glassScope = "pending-hydration";
pendingSurface.dataset.glassMounted = "false";
pendingSurface.style.backgroundColor = "#ffffff";
document.body.append(pendingSurface);
const releasePending = acquireGlass({ id: "pending-hydration" });
assert.equal(
  pendingSurface.style.getPropertyValue("--glass-base"),
  "",
  "unhydrated surfaces keep server styles untouched",
);
pendingSurface.dataset.glassMounted = "true";
await pause();
assert.deepEqual(
  parseGlassColor(pendingSurface.style.getPropertyValue("--glass-base")),
  parseGlassColor(window.getComputedStyle(pendingSurface).backgroundColor),
  "hydrated surfaces join normal sampling",
);
releasePending();
pendingSurface.remove();
scenario(
  "translucent caller paint falls back after SVG fails, with shared idempotent leases",
);
// Translucent caller paint remains eligible for renderer fallback.
surface.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
reducedTransparency = false;
const releaseOne = acquireGlass({ id: "leases" });
const releaseTwo = acquireGlass({ id: "leases" });
await pause();
assert.equal(surface.dataset.glassState, "fallback");
assert.ok(svgAttempts > 1, "surfaces attempt SVG before falling back");
assert.ok(surface.style.getPropertyValue("--glass-base"));
surface.style.backgroundColor = "rgba(22, 22, 23, 0.5)";
await pause();
assert.equal(
  surface.style.getPropertyValue("--glass-base"),
  "rgb(47, 47, 48)",
  "fallback material must recomposite changed caller paint over the 12% Clear tint",
);
releaseOne();
assert.equal(
  surface.dataset.glassState,
  "fallback",
  "one owner releasing cannot destroy a shared manager",
);
releaseOne();
assert.equal(
  surface.dataset.glassState,
  "fallback",
  "release callbacks must be idempotent",
);
releaseTwo();
reducedTransparency = true;
assert.equal(surface.dataset.glassState, undefined);
assert.equal(surface.style.getPropertyValue("--glass-base"), "");
assert.ok(observers.every((observer) => observer.disconnected));

scenario("releasing a DOM lease restores the caller's own glass styles");
const leaseStyle = {
  "--glass-filter": 'url("#caller-filter")',
  "--glass-edge": "linear-gradient(red, blue)",
  "--glass-initial-edge-shadow": "inset 0 0 1px red",
  "--glass-opacity": "23%",
  "--glass-base": "rgb(12, 34, 56)",
};
const leased = document.createElement("div");
leased.dataset.glass = "true";
leased.dataset.glassScope = "caller-styles";
for (const [property, value] of Object.entries(leaseStyle))
  leased.style.setProperty(property, value, "important");
document.body.append(leased);
const releaseStyleOne = acquireGlass({ id: "caller-styles" });
const releaseStyleTwo = acquireGlass({ id: "caller-styles" });
releaseStyleOne();
assert.notEqual(
  leased.style.getPropertyValue("--glass-base"),
  leaseStyle["--glass-base"],
);
releaseStyleTwo();
releaseStyleTwo();
for (const [property, value] of Object.entries(leaseStyle)) {
  assert.equal(leased.style.getPropertyValue(property), value);
  assert.equal(leased.style.getPropertyPriority(property), "important");
}
for (const refresh of [false, true]) {
  const release = acquireGlass({ id: "caller-styles" });
  leased.style.setProperty("--glass-base", "rgb(70, 80, 90)", "important");
  if (refresh) {
    updateGlassConfiguration({
      id: "caller-styles",
      strength: 30,
    });
    await pause();
    assert.notEqual(
      leased.style.getPropertyValue("--glass-base"),
      "rgb(70, 80, 90)",
    );
  }
  release();
  assert.equal(
    leased.style.getPropertyValue("--glass-base"),
    "rgb(70, 80, 90)",
  );
  assert.equal(leased.style.getPropertyPriority("--glass-base"), "important");
  for (const [property, value] of Object.entries(leaseStyle)) {
    if (property === "--glass-base") continue;
    assert.equal(leased.style.getPropertyValue(property), value);
    assert.equal(leased.style.getPropertyPriority(property), "important");
  }
}
leased.remove();

scenario(
  "a surface moved to a new scope keeps its state when the old owner releases",
);
const transferred = document.createElement("div");
transferred.dataset.glass = "true";
transferred.dataset.glassScope = "previous-scope";
transferred.style.backgroundColor = "transparent";
transferred.style.color = "rgb(20, 30, 40)";
transferred.style.borderRadius = "9px";
transferred.style.setProperty("padding", "4px", "important");
document.body.append(transferred);
const originalTransferredStyle = transferred.getAttribute("style");
const releasePreviousScope = acquireGlass({ id: "previous-scope" });
transferred.dataset.glassScope = "next-scope";
const releaseNextScope = acquireGlass({
  id: "next-scope",
  tintOpacity: 0.65,
});
const transferredState = transferred.dataset.glassState;
const transferredPaint = transferred.getAttribute("style");
assert.ok(transferredState);
releasePreviousScope();
assert.equal(
  transferred.dataset.glassState,
  transferredState,
  "a delayed previous owner cannot clear the new scope's state",
);
assert.equal(transferred.getAttribute("style"), transferredPaint);
await pause();
assert.equal(transferred.dataset.glassState, "css");
assert.equal(transferred.style.getPropertyValue("--glass-opacity"), "65%");
releaseNextScope();
assert.equal(transferred.getAttribute("style"), originalTransferredStyle);
assert.equal(transferred.dataset.glassState, undefined);
transferred.remove();

scenario("a hidden surface initializes the renderer only once shown");
const hidden = document.createElement("div");
hidden.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
hidden.hidden = true;
hidden.dataset.closed = "";
hidden.dataset.glass = "true";
hidden.dataset.glassScope = "hidden";
document.body.append(hidden);
reducedTransparency = false;
const beforeHidden = svgAttempts;
const releaseHidden = acquireGlass({ id: "hidden" });
await pause();
assert.equal(
  svgAttempts,
  beforeHidden,
  "hidden surfaces do not initialize an unused renderer",
);
hidden.hidden = false;
await pause();
assert.equal(
  svgAttempts,
  beforeHidden + 1,
  "a visible closed-state surface initializes enhancement",
);
assert.equal(hidden.dataset.glassState, "fallback");

releaseHidden();
reducedTransparency = true;
assert.equal(hidden.dataset.glassState, undefined);
assert.ok(observers.every((observer) => observer.disconnected));
scenario(
  "theme toggle transitions clean up in order and the locale toggle follows its glyph",
);
const { ThemeToggle } = await import("@workspace/ui/components/theme-toggle");
const { LocaleToggle } = await import("@workspace/ui/components/locale-toggle");
const transitionFinishes: (() => void)[] = [];
Object.defineProperty(document, "startViewTransition", {
  configurable: true,
  value: (update: () => void) => {
    update();
    return {
      finished: new Promise<void>((resolve) =>
        transitionFinishes.push(resolve),
      ),
    };
  },
});
function click(id: string) {
  const element = document.getElementById(id);
  if (!(element instanceof window.HTMLElement))
    throw new Error(`Missing control: ${id}`);
  element.click();
}
const changes: string[] = [];
const languages: string[] = [];
const toggleHost = document.createElement("div");
document.body.append(toggleHost);
const toggleRoot = createRoot(toggleHost as unknown as HTMLElement);
function Toggles() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [locale, setLocale] = useState("en-US");
  const change = (next: "light" | "dark") => {
    changes.push(next);
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };
  return (
    <>
      <ThemeToggle
        id="circle-toggle"
        theme={theme}
        onThemeChange={change}
        variant="circle"
        start="button"
      />
      <ThemeToggle
        id="blinds-toggle"
        theme={theme}
        onThemeChange={change}
        variant="blinds"
        start="top-right"
      />
      <ThemeToggle
        id="cancelled-toggle"
        theme={theme}
        onThemeChange={change}
        onClick={(event) => event.preventDefault()}
      />
      <LocaleToggle
        id="locale-toggle"
        value={locale}
        onValueChange={(next) => {
          languages.push(next);
          setLocale(next);
        }}
        options={[
          { value: "en-US", label: "English" },
          { value: "zh-CN", label: "简体中文" },
        ]}
      />
    </>
  );
}
await act(async () => toggleRoot.render(<Toggles />));
await act(async () => click("circle-toggle"));
assert.equal(document.documentElement.dataset.appearanceTransition, "circle");
assert.equal(
  document.documentElement.style.getPropertyValue("--appearance-x"),
  "80px",
);
await act(async () => click("blinds-toggle"));
assert.deepEqual(changes, ["dark", "light"]);
assert.equal(document.documentElement.dataset.appearanceTransition, "blinds");
transitionFinishes[0]?.();
await Promise.resolve();
assert.equal(
  document.documentElement.dataset.appearanceTransition,
  "blinds",
  "an older transition cannot clean another toggle's active styles",
);
transitionFinishes[1]?.();
await Promise.resolve();
assert.equal(document.documentElement.dataset.appearanceTransition, undefined);
assert.equal(
  document.documentElement.style.getPropertyValue("--appearance-x"),
  "",
);
await act(async () => click("cancelled-toggle"));
assert.deepEqual(changes, ["dark", "light"]);
async function waitForLanguageCount(count: number) {
  const deadline = Date.now() + 2000;
  while (languages.length < count && Date.now() < deadline)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  assert.equal(
    languages.length,
    count,
    "locale callback follows the glyph endpoint",
  );
}
await act(async () => click("locale-toggle"));
await waitForLanguageCount(1);
await act(async () => click("locale-toggle"));
await waitForLanguageCount(2);
assert.deepEqual(languages, ["zh-CN", "en-US"]);
assert.equal(
  window.localStorage.length,
  0,
  "shared toggles must not own browser preferences",
);
await act(async () => toggleRoot.unmount());
scenario("the language selector portal inherits the glass scope");
const selectorHost = document.createElement("div");
document.body.append(selectorHost);
const selectorRoot = createRoot(selectorHost as unknown as HTMLElement);
await act(async () =>
  selectorRoot.render(
    <LocaleToggle
      id="glass-language-selector"
      glass
      value="en-US"
      onValueChange={() => {}}
      options={[
        { value: "en-US", label: "English" },
        { value: "zh-CN", label: "简体中文" },
        { value: "fr-FR", label: "Français" },
      ]}
    />,
  ),
);
await act(async () => click("glass-language-selector"));
await act(async () => pause());
assert.equal(
  document
    .querySelector('[data-slot="select-content"]')
    ?.getAttribute("data-glass"),
  "true",
  "the language selector portal inherits the enabled glass scope",
);
await act(async () => selectorRoot.unmount());
scenario("the navigation menu popup owns its painted background");
const {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} = await import("@workspace/ui/components/navigation-menu");
const { SidebarProvider, Sidebar } = await import(
  "@workspace/ui/components/sidebar"
);
const navigationHost = document.createElement("div");
document.body.append(navigationHost);
const navigationRoot = createRoot(navigationHost as unknown as HTMLElement);
await act(async () => {
  navigationRoot.render(
    <NavigationMenu glass defaultValue="products">
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger id="menu-trigger">
            Products
          </NavigationMenuTrigger>
          <NavigationMenuContent id="menu-content">
            <NavigationMenuLink href="/products" id="menu-link">
              Products
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>,
  );
});
await act(async () => pause());
const navigationPopup = document.querySelector(
  '[data-slot="navigation-menu-popup"]',
);
assert.ok(navigationPopup);
assert.equal(navigationPopup.getAttribute("data-glass"), "true");
assert.equal(
  document.getElementById("menu-trigger")?.getAttribute("data-glass"),
  null,
  "the menu's glass reaches its popup, not its triggers",
);
assert.equal(
  document.getElementById("menu-content")?.getAttribute("data-glass"),
  null,
);
assert.equal(
  document.getElementById("menu-link")?.getAttribute("data-glass"),
  null,
);
assert.equal(
  document
    .getElementById("menu-content")
    ?.closest('[data-slot="navigation-menu-popup"]'),
  navigationPopup,
  "the actual popup owns the whole painted background without sampling its content twice",
);
await act(async () => navigationRoot.unmount());

scenario("the sidebar never acquires a glass material");
const sidebarHost = document.createElement("div");
document.body.append(sidebarHost);
const sidebarRoot = createRoot(sidebarHost as unknown as HTMLElement);
const sidebarRef = createRef<HTMLDivElement>();
await act(async () => {
  sidebarRoot.render(
    <SidebarProvider>
      <Sidebar id="sidebar-layout" ref={sidebarRef}>
        Navigation
      </Sidebar>
    </SidebarProvider>,
  );
});
await act(async () => pause());
const sidebarSurface = document.querySelector('[data-slot="sidebar-inner"]');
assert.ok(sidebarSurface);
assert.equal(sidebarSurface.getAttribute("data-glass"), null);
assert.equal(
  sidebarSurface.getAttribute("data-glass-state"),
  null,
  "structural navigation never acquires a glass material",
);
assert.equal(
  sidebarRef.current?.id,
  "sidebar-layout",
  "the public native ref still targets the original layout container",
);
assert.equal(sidebarRef.current?.getAttribute("data-glass"), null);
assert.equal(
  sidebarRef.current?.querySelectorAll('[data-glass="true"]').length,
  0,
);
await act(async () => sidebarRoot.unmount());
assert.equal(sidebarRef.current, null);
scenario("theme examples follow the saved theme and keep the accent");
Object.assign(globalThis, { localStorage: window.localStorage });
const { ThemeProvider, useTheme } = await import("next-themes");
const { default: ThemeExample } = await import(
  "../../src/examples/variants/theme-toggle-demo"
);
const { default: ThemeVariants } = await import(
  "../../src/examples/variants/theme-toggle-variants"
);
const globals = readFileSync(
  new URL("../../../../packages/ui/src/styles/globals.css", import.meta.url),
  "utf8",
);
const themeRules = [
  globals.match(/^:root \{([^}]+)\}/m)?.[0],
  globals.match(/^\.dark \{([^}]+)\}/m)?.[0],
].join("\n");
const exampleStyle = document.createElement("style");
exampleStyle.textContent = cssForHappyDOM(
  `${themeRules}\n.bg-background { background-color: var(--background); }`,
);
document.head.append(exampleStyle);
window.localStorage.setItem("theme", "dark");
document.documentElement.dataset.color = "bamboo";
let setAppearance: ((value: string) => void) | undefined;
function ThemeProbe() {
  setAppearance = useTheme().setTheme;
  return null;
}
const exampleHost = document.createElement("div");
document.body.append(exampleHost);
const exampleRoot = createRoot(exampleHost as unknown as HTMLElement);
await act(async () => {
  exampleRoot.render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      scriptProps={{ type: "application/json" }}
    >
      <ThemeExample locale="en-US" />
      <ThemeVariants locale="en-US" />
      <ThemeProbe />
    </ThemeProvider>,
  );
});
assert.ok(document.documentElement.classList.contains("dark"));
assert.equal(
  exampleHost.querySelector("output")?.textContent,
  "Dark",
  "theme examples reflect a saved dark application theme",
);
const exampleButtons = [
  ...exampleHost.querySelectorAll('[data-slot="theme-toggle"]'),
].filter(
  (element): element is InstanceType<typeof window.HTMLButtonElement> =>
    element instanceof window.HTMLButtonElement,
);
assert.equal(exampleButtons.length, 5);
assert.ok(
  exampleButtons.every(
    (button) => button.getAttribute("aria-pressed") === "true",
  ),
);
const examplePanel = exampleHost.querySelector(".bg-background");
assert.ok(examplePanel instanceof window.HTMLElement);
const darkPanelBackground =
  window.getComputedStyle(examplePanel).backgroundColor;
await act(async () => exampleButtons[0].click());
assert.equal(document.documentElement.classList.contains("dark"), false);
assert.equal(exampleHost.querySelector("output")?.textContent, "Light");
assert.notEqual(
  window.getComputedStyle(examplePanel).backgroundColor,
  darkPanelBackground,
  "switching a previously dark documentation theme actually changes the sample canvas",
);
assert.equal(window.localStorage.getItem("theme"), "light");
assert.equal(
  document.documentElement.dataset.color,
  "bamboo",
  "theme examples retain the selected accent",
);
assert.ok(
  exampleButtons.every(
    (button) => button.getAttribute("aria-pressed") === "false",
  ),
);
await act(async () => exampleButtons[2].click());
assert.equal(document.documentElement.classList.contains("dark"), true);
assert.equal(window.localStorage.getItem("theme"), "dark");
assert.equal(document.documentElement.dataset.appearanceTransition, "circle");
document.documentElement.dataset.color = "custom";
document.documentElement.dataset.colorSeed = "#123456";
document.documentElement.style.setProperty(
  "--primary",
  "oklch(0.31916842 0.07245452 251.16845)",
);
await act(async () => exampleButtons[0].click());
assert.equal(document.documentElement.dataset.color, "custom");
assert.equal(
  document.documentElement.style.getPropertyValue("--primary"),
  "oklch(0.31916842 0.07245452 251.16845)",
  "an in-memory custom accent is retained even without a saved accent",
);
assert.ok(setAppearance);
await act(async () => setAppearance?.("system"));
assert.equal(
  window.localStorage.getItem("theme"),
  "system",
  "the application still supports System after demonstration switches",
);
for (const finish of transitionFinishes) finish();
await Promise.resolve();
await act(async () => exampleRoot.unmount());
exampleStyle.remove();
scenario("frosted glass is CSS only and never acquires the runtime");
const capabilityHost = document.createElement("div");
document.body.append(capabilityHost);
const capabilityRoot = createRoot(capabilityHost as unknown as HTMLElement);
reducedTransparency = false;
const beforeFrosted = svgAttempts;
const beforeFrostedObservers = observers.length;
await act(async () =>
  capabilityRoot.render(
    <Button id="frosted-capability" frosted>
      Frosted
    </Button>,
  ),
);
await pause();
const frostedButton = document.querySelector<
  typeof window.HTMLElement.prototype
>("#frosted-capability");
assert.equal(frostedButton?.getAttribute("data-frosted"), "true");
assert.equal(frostedButton?.hasAttribute("data-glass"), false);
assert.equal(frostedButton?.hasAttribute("data-glass-state"), false);
assert.equal(svgAttempts, beforeFrosted, "frosted glass never requests SVG");
assert.equal(
  observers.length,
  beforeFrostedObservers,
  "frosted glass does not acquire a runtime owner",
);
await act(async () => capabilityRoot.unmount());
capabilityHost.remove();

scenario(
  "a Clear surface with nothing to refract never loads the SVG renderer",
);
reducedTransparency = false;
const glassSurface = (scope: string) => {
  const element = document.createElement("div");
  element.dataset.glass = "true";
  element.dataset.glassScope = scope;
  document.body.append(element);
  return element;
};
// Like the TabBar lens: Clear for its edge light, without a backdrop.
const flat = glassSurface("flat-lens");
flat.style.setProperty("backdrop-filter", "none");
const beforeFlat = svgAttempts;
const releaseFlat = acquireGlass({ id: "flat-lens" });
await pause();
assert.equal(svgAttempts, beforeFlat, "a disabled backdrop requests no SVG");
assert.equal(flat.dataset.glassState, "css");
assert.match(
  flat.style.getPropertyValue("--glass-edge"),
  /^url\("data:image\/svg\+xml/,
  "its edge light still shows",
);
const refracting = glassSurface("flat-lens");
await pause();
assert.equal(
  svgAttempts,
  beforeFlat + 1,
  "a surface that can refract still requests SVG",
);
releaseFlat();
flat.remove();
refracting.remove();
scenario("glass inside a glass layer keeps its edge light without refracting");
const outerLayer = glassSurface("outer-layer");
const nested = document.createElement("div");
nested.dataset.glass = "true";
nested.dataset.glassScope = "nested-layer";
// glass.css drops a nested surface's backdrop filter.
nested.style.setProperty("backdrop-filter", "none");
outerLayer.append(nested);
const beforeNested = svgAttempts;
const releaseOuter = acquireGlass({ id: "outer-layer" });
await pause();
assert.equal(svgAttempts, beforeNested + 1, "the outer layer refracts");
const releaseNested = acquireGlass({ id: "nested-layer" });
await pause();
assert.equal(
  svgAttempts,
  beforeNested + 1,
  "nested glass never refracts the outer layer again",
);
assert.equal(nested.dataset.glassState, "css");
assert.match(
  nested.style.getPropertyValue("--glass-edge"),
  /^url\("data:image\/svg\+xml/,
  "nested glass keeps its edge light",
);
assert.ok(nested.style.getPropertyValue("--glass-opacity"), "and its tint");
releaseNested();
releaseOuter();
outerLayer.remove();
reducedTransparency = true;
await window.happyDOM.close();
