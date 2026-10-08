import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Button } from "@workspace/ui/components/button";
import { GlassProvider, GlassSurface } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
} from "@workspace/ui/components/menubar";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu";
import { QRCode } from "@workspace/ui/components/qr-code";
import { Sidebar, SidebarProvider } from "@workspace/ui/components/sidebar";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import {
  GlassContext,
  withGlass,
} from "../../../packages/ui/src/lib/glass/context";
import { glassIntensityDefaults } from "../../../packages/ui/src/lib/glass/intensity";

function Element(props: ComponentProps<"div">) {
  return <div {...props} />;
}
const Scope = withGlass(Element, "scope");
const Surface = withGlass(Element);

function tag(html: string, id: string) {
  return (
    [...html.matchAll(/<\w+\b[^>]*>/g)]
      .map(([element]) => element)
      .find((element) => element.includes(`id="${id}"`)) ?? ""
  );
}

describe("glass preserves component semantics", () => {
  test("three intensities render their shared CSS defaults before hydration", () => {
    const html = renderToString(
      <GlassProvider>
        <GlassSurface id="inherited-intensity">Default</GlassSurface>
        <GlassSurface id="sm-intensity" intensity="sm">
          Small
        </GlassSurface>
        <GlassSurface id="lg-intensity" intensity="lg">
          Large
        </GlassSurface>
        <GlassSurface id="ordinary" glass={false}>
          Ordinary
        </GlassSurface>
      </GlassProvider>,
    );
    for (const [id, intensity, blur, opacity] of [
      ["inherited-intensity", "default", 6, 60],
      ["sm-intensity", "sm", 4, 40],
      ["lg-intensity", "lg", 8, 78],
    ] as const) {
      const element = tag(html, id);
      expect(element).toContain('data-glass="true"');
      expect(element).toContain(`data-glass-intensity="${intensity}"`);
      expect(element).toContain(`--glass-initial-blur:${blur}px`);
      expect(element).toContain(`--glass-initial-opacity:${opacity}%`);
      expect(element).not.toContain(" intensity=");
      expect(element).not.toContain(" material=");
      expect(element).not.toContain("data-glass-material");
    }
    expect(tag(html, "ordinary")).not.toContain('data-glass="true"');
    expect(html).toContain('data-glass-state="loading"');
    expect(html).not.toContain('data-glass-state="ready"');
    expect(html).not.toContain("<canvas");
  });
  test("provider intensity inherits through controls and a surface can override it", () => {
    const html = renderToString(
      <GlassProvider intensity="lg">
        <GlassSurface id="large-surface">
          <Input id="large-input" />
          <Input id="small-input" glassIntensity="sm" />
        </GlassSurface>
        <GlassSurface intensity="sm" id="small-surface" />
      </GlassProvider>,
    );
    for (const id of ["large-surface", "large-input"])
      expect(tag(html, id)).toContain('data-glass-intensity="lg"');
    for (const id of ["small-surface", "small-input"])
      expect(tag(html, id)).toContain('data-glass-intensity="sm"');
  });
  test("invalid runtime intensity values use default constants", () => {
    expect(glassIntensityDefaults()).toEqual({ blur: 6, tintOpacity: 0.6 });
    expect(glassIntensityDefaults("unknown")).toEqual({
      blur: 6,
      tintOpacity: 0.6,
    });
    expect(glassIntensityDefaults("sm")).toEqual({ blur: 4, tintOpacity: 0.4 });
    expect(glassIntensityDefaults("lg")).toEqual({
      blur: 8,
      tintOpacity: 0.78,
    });
  });
  test("server material respects zero blur, zero tint opacity, and disabled highlights", () => {
    const html = renderToString(
      <GlassProvider
        intensity="lg"
        options={{ blur: 0, tint: "#161617", tintOpacity: 0, highlight: 0 }}
      >
        <GlassSurface id="initial-options" style={{ minHeight: 48 }} />
      </GlassProvider>,
    );
    const element = tag(html, "initial-options");
    expect(element).toContain("--glass-initial-blur:8px");
    expect(element).toContain("--glass-initial-opacity:78%");
    expect(element).toContain("--glass-blur:0px");
    expect(element).toContain("--glass-opacity:0%");
    expect(element).toContain("--glass-base:#161617");
    expect(element).toContain("--glass-edge:none");
    expect(element).toContain("--glass-initial-edge-shadow:0 0 #0000");
    expect(element).toContain("min-height:48px");
  });
  test("initial native-element lighting follows CSS radius and preserves focus shadows", () => {
    const css = readFileSync(
      new URL(
        "../../../packages/ui/src/styles/components/glass.css",
        import.meta.url,
      ),
      "utf8",
    );
    expect(css).not.toContain("data:image/svg+xml");
    expect(css).toContain("--glass-initial-edge-shadow");
    expect(css).toContain("inset 0.8px 0.8px");
    for (const shadow of [
      "inset-shadow",
      "inset-ring-shadow",
      "ring-offset-shadow",
      "ring-shadow",
      "shadow",
    ])
      expect(css).toContain(`var(--tw-${shadow},`);
    const html = renderToString(<Input glass id="initial-input" />);
    expect(html).toMatch(/^<input\b/);
    expect(tag(html, "initial-input")).toContain("rounded-3xl");
    expect(tag(html, "initial-input")).toContain('data-glass-state="loading"');
    expect(html).not.toContain("<svg");
  });
  test("scope enables one surface layer, explicit false overrides and explicit true nests deliberately", () => {
    const html = renderToString(
      <GlassContext.Provider
        value={{
          enabled: false,
          surface: false,
          configuration: { id: "shared-test-scope" },
        }}
      >
        <Scope glass id="scope">
          <Button id="inherited" type="button">
            Inherited
          </Button>
          <Button id="disabled-glass" type="button" glass={false}>
            Plain
          </Button>
          <Surface id="surface">
            <Button id="nested" type="button">
              One layer
            </Button>
            <Button id="explicit-nested" type="button" glass>
              Two layers
            </Button>
          </Surface>
        </Scope>
      </GlassContext.Provider>,
    );
    expect(tag(html, "scope")).not.toContain("data-glass=");
    expect(tag(html, "inherited")).toContain('data-glass="true"');
    expect(tag(html, "inherited")).toContain(
      'data-glass-scope="shared-test-scope"',
    );
    expect(tag(html, "disabled-glass")).not.toContain("data-glass=");
    expect(tag(html, "surface")).toContain('data-glass="true"');
    expect(tag(html, "nested")).toContain('data-glass="true"');
    expect(tag(html, "explicit-nested")).toContain('data-glass="true"');
    expect(html).toContain('data-glass-state="loading"');
    expect(html).not.toContain('data-glass-state="ready"');
  });
  test("independent controls inherit while compound internals and opted-out scopes stay plain", () => {
    const html = renderToString(
      <GlassSurface>
        <Input id="nested-input" />
        <Surface id="content-wrapper">Content</Surface>
        <InputGroup id="group-material">
          <InputGroupInput id="group-input" />
          <InputGroupButton id="group-action">Clear</InputGroupButton>
        </InputGroup>
        <Input glass={false} id="plain-input" />
        <GlassSurface glass={false}>
          <Button id="plain-scope-button">Plain</Button>
        </GlassSurface>
      </GlassSurface>,
    );
    expect(tag(html, "nested-input")).toContain('data-glass="true"');
    expect(tag(html, "group-material")).toContain('data-glass="true"');
    for (const id of [
      "content-wrapper",
      "group-input",
      "group-action",
      "plain-input",
      "plain-scope-button",
    ])
      expect(tag(html, id)).not.toContain("data-glass=");
  });
  test("independent controls inherit glass inside a surface and tooltip scope", () => {
    const html = renderToString(
      <GlassSurface id="tooltip-surface">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={<Button id="tooltip-trigger" type="button" />}
            >
              Show help
            </TooltipTrigger>
          </Tooltip>
        </TooltipProvider>
      </GlassSurface>,
    );
    expect(tag(html, "tooltip-surface")).toContain('data-glass="true"');
    expect(tag(html, "tooltip-trigger")).toContain('data-glass="true"');
  });
  test("menubar controls inherit material independently inside a glass surface", () => {
    const html = renderToString(
      <GlassSurface>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger id="glass-menu-trigger">File</MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger id="plain-menu-trigger" glass={false}>
              Help
            </MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      </GlassSurface>,
    );
    expect(tag(html, "glass-menu-trigger")).toContain('data-glass="true"');
    expect(tag(html, "plain-menu-trigger")).not.toContain("data-glass=");
  });
  test("QR shells use a real glass scope and leave the scanner image undecorated", () => {
    const html = renderToString(
      <GlassContext.Provider
        value={{
          enabled: true,
          surface: false,
          configuration: { id: "qr-scope" },
        }}
      >
        <GlassSurface id="card">
          <QRCode id="code" value="connect:studio" />
        </GlassSurface>
        <GlassSurface id="plain-card" glass={false}>
          <QRCode value="connect:studio" />
        </GlassSurface>
      </GlassContext.Provider>,
    );
    expect(tag(html, "card")).toContain('data-glass="true"');
    expect(tag(html, "card")).toContain('data-glass-scope="qr-scope"');
    expect(tag(html, "code")).not.toContain("data-glass=");
    expect(tag(html, "plain-card")).not.toContain("data-glass=");
  });
  test("desktop and static sidebar glass marks the painted surface and preserves its outer container", () => {
    const desktop = renderToString(
      <SidebarProvider>
        <Sidebar glass id="desktop-sidebar">
          Navigation
        </Sidebar>
      </SidebarProvider>,
    );
    const painted = [...desktop.matchAll(/<\w+\b[^>]*>/g)]
      .map(([element]) => element)
      .find((element) => element.includes('data-slot="sidebar-inner"'));
    expect(painted).toContain('data-glass="true"');
    expect(painted).toContain("bg-sidebar");
    expect(tag(desktop, "desktop-sidebar")).not.toContain("data-glass=");
    expect(tag(desktop, "desktop-sidebar")).toContain("border-transparent");
    expect([...desktop.matchAll(/data-glass="true"/g)]).toHaveLength(1);
    const staticSidebar = renderToString(
      <SidebarProvider>
        <Sidebar glass collapsible="none" id="static-sidebar">
          Navigation
        </Sidebar>
      </SidebarProvider>,
    );
    expect(tag(staticSidebar, "static-sidebar")).toContain('data-glass="true"');
    const plain = renderToString(
      <SidebarProvider>
        <Sidebar id="plain-sidebar">Navigation</Sidebar>
      </SidebarProvider>,
    );
    expect(plain).not.toContain('data-glass="true"');
  });
  test("navigation triggers inherit the enabled scope without decorating the layout root", () => {
    const html = renderToString(
      <NavigationMenu glass id="navigation">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger id="navigation-trigger">
              Products
            </NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(tag(html, "navigation")).not.toContain("data-glass=");
    expect(tag(html, "navigation-trigger")).toContain('data-glass="true"');
  });
  test("isolated DOM keeps native refs, forms, leases and fallback behavior", () => {
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        new URL("./fixtures/glass-dom.tsx", import.meta.url).pathname,
      ],
      cwd: new URL("..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
    expect(new TextDecoder().decode(result.stdout)).toContain(
      "hidden surfaces passed",
    );
  }, 10_000);
});
