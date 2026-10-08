import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
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
let gpuAttempts = 0;
Object.defineProperty(window.navigator, "gpu", {
  configurable: true,
  value: {
    requestAdapter: async () => {
      gpuAttempts++;
      return null;
    },
  },
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value: (type: string) => {
    if (type !== "2d") return null;
    return {
      fillStyle: "#ffffff",
      fillRect() {},
      getImageData() {
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
const { GlassProvider, GlassSurface } = await import(
  "@workspace/ui/components/glass"
);
const { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } =
  await import("@workspace/ui/components/tooltip");
const { GlassContext } = await import(
  "../../../../packages/ui/src/lib/glass/context"
);
const { acquireGlass } = await import("@workspace/ui/lib/glass/runtime");
const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const configuration = { id: "dom-native-controls" };
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const buttonRef = createRef<HTMLButtonElement>();
const inputRef = createRef<HTMLInputElement>();
let clicked = 0;
let submitted = 0;
await act(async () => {
  root.render(
    <GlassContext.Provider
      value={{ configuration, enabled: true, surface: false }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted++;
        }}
      >
        <Button ref={buttonRef} type="button" onClick={() => clicked++}>
          Copy
        </Button>
        <Input ref={inputRef} name="workspace" defaultValue="Studio" />
        <Button id="plain" glass={false} type="button">
          Plain
        </Button>
      </form>
    </GlassContext.Provider>,
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
assert.equal(
  buttonRef.current?.getAttribute("data-glass-scope"),
  configuration.id,
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
await pause();
assert.equal(gpuAttempts, 0, "default CSS mode must never request a GPU");
assert.equal(
  buttonRef.current?.dataset.glassState,
  "css",
  "CSS mode initializes a usable material",
);
assert.equal(buttonRef.current?.style.getPropertyValue("--glass-frame"), "");
await act(async () => root.unmount());
assert.equal(buttonRef.current, null);
assert.equal(inputRef.current, null);
assert.ok(observers.every((observer) => observer.disconnected));

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
  <GlassProvider>
    <Toggle id="semantic-toggle" glass>
      Selected
    </Toggle>
    <Switch id="semantic-switch" checked={checked} glass />
  </GlassProvider>
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
  semanticSwitch.style.getPropertyValue("--glass-base"),
  "rgb(0, 88, 204)",
  "a controlled Switch updates its material without a native input event",
);
await act(async () => semanticRoot.render(semanticControls(false)));
await act(async () => pause());
assert.equal(
  semanticSwitch.style.getPropertyValue("--glass-base"),
  "rgb(255, 255, 255)",
);
assert.deepEqual(semanticEvents, { input: 0, change: 0 });
await act(async () => semanticRoot.unmount());
semanticStyle.remove();

const tooltipHost = document.createElement("div");
document.body.append(tooltipHost);
const tooltipRoot = createRoot(tooltipHost as unknown as HTMLElement);
await act(async () => {
  tooltipRoot.render(
    <GlassProvider>
      <GlassSurface id="tooltip-parent" material="clear">
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger
              render={<Button id="tooltip-trigger" type="button" />}
            >
              Help
            </TooltipTrigger>
            <TooltipContent id="tooltip-popup">Useful help</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </GlassSurface>
    </GlassProvider>,
  );
});
await act(async () => pause());
const tooltipParent = document.getElementById("tooltip-parent");
assert.ok(tooltipParent instanceof window.HTMLElement);
assert.equal(tooltipParent.style.getPropertyValue("--glass-blur"), "6px");
assert.equal(tooltipParent.style.getPropertyValue("--glass-opacity"), "60%");
assert.equal(
  document.getElementById("tooltip-trigger")?.hasAttribute("data-glass"),
  true,
  "an independent trigger inside an existing material inherits glass",
);
assert.equal(
  document.getElementById("tooltip-popup")?.getAttribute("data-glass"),
  "true",
  "a portaled tooltip owns an independent material surface",
);
assert.equal(gpuAttempts, 0, "portals in CSS mode also avoid GPU requests");
await act(async () => tooltipRoot.unmount());

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
  mode: "css",
  options: { blur: 0, tintOpacity: 0 },
});
assert.equal(
  surface.style.getPropertyValue("--glass-base"),
  nativeMaterial,
  "initial glass must read the native dark background instead of the decorated material",
);
assert.equal(surface.style.getPropertyValue("--glass-blur"), "0px");
assert.equal(surface.style.getPropertyValue("--glass-opacity"), "0%");
initialRelease();
initialThemeStyle.remove();
surface.style.backgroundColor = "#ffffff";
const releaseOne = acquireGlass({ id: "leases", mode: "auto" });
const releaseTwo = acquireGlass({ id: "leases", mode: "auto" });
await pause();
assert.equal(surface.dataset.glassState, "fallback");
assert.ok(
  gpuAttempts > 0,
  "auto mode attempts GPU initialization before fallback",
);
assert.ok(surface.style.getPropertyValue("--glass-base"));
surface.style.backgroundColor = "#161617";
await pause();
assert.equal(
  surface.style.getPropertyValue("--glass-base"),
  window.getComputedStyle(surface).backgroundColor,
  "fallback material must refresh when the application changes appearance",
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
assert.equal(surface.dataset.glassState, undefined);
assert.equal(surface.style.getPropertyValue("--glass-base"), "");
assert.equal(surface.style.getPropertyValue("--glass-frame"), "");
assert.ok(observers.every((observer) => observer.disconnected));

const hidden = document.createElement("div");
hidden.style.backgroundColor = "#ffffff";
hidden.hidden = true;
hidden.dataset.glass = "true";
hidden.dataset.glassScope = "hidden";
document.body.append(hidden);
const beforeHidden = gpuAttempts;
const releaseHidden = acquireGlass({ id: "hidden", mode: "auto" });
await pause();
assert.equal(
  gpuAttempts,
  beforeHidden,
  "hidden surfaces cannot trigger a screenshot or GPU work",
);
hidden.hidden = false;
await pause();
assert.equal(hidden.dataset.glassState, "fallback");

releaseHidden();
assert.equal(hidden.dataset.glassState, undefined);
assert.ok(observers.every((observer) => observer.disconnected));
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
const selectorHost = document.createElement("div");
document.body.append(selectorHost);
const selectorRoot = createRoot(selectorHost as unknown as HTMLElement);
await act(async () =>
  selectorRoot.render(
    <GlassProvider>
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
      />
    </GlassProvider>,
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
    <GlassProvider>
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
      </NavigationMenu>
    </GlassProvider>,
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
  "true",
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

const sidebarHost = document.createElement("div");
document.body.append(sidebarHost);
const sidebarRoot = createRoot(sidebarHost as unknown as HTMLElement);
const sidebarRef = createRef<HTMLDivElement>();
await act(async () => {
  sidebarRoot.render(
    <GlassProvider>
      <SidebarProvider>
        <Sidebar glass id="sidebar-layout" ref={sidebarRef}>
          Navigation
        </Sidebar>
      </SidebarProvider>
    </GlassProvider>,
  );
});
await act(async () => pause());
const sidebarSurface = document.querySelector('[data-slot="sidebar-inner"]');
assert.ok(sidebarSurface);
assert.equal(sidebarSurface.getAttribute("data-glass"), "true");
assert.equal(sidebarSurface.getAttribute("data-glass-state"), "css");
assert.equal(
  sidebarRef.current?.id,
  "sidebar-layout",
  "the public native ref still targets the original layout container",
);
assert.equal(sidebarRef.current?.getAttribute("data-glass"), null);
assert.equal(
  sidebarRef.current?.querySelectorAll('[data-glass="true"]').length,
  1,
);
await act(async () => sidebarRoot.unmount());
assert.equal(sidebarRef.current, null);
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
await window.happyDOM.close();
console.log(
  "CSS mode avoids GPU work; native refs/form semantics, false override, auto fallback, shared cleanup, and hidden surfaces passed",
);
