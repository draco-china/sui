import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Button } from "@workspace/ui/components/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@workspace/ui/components/button-group";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Label } from "@workspace/ui/components/label";
import { Marker } from "@workspace/ui/components/marker";
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
  test("boolean glass keeps the original surface boundary without fixed inline blur", () => {
    const html = renderToString(
      <>
        <GlassSurface id="enabled">Glass</GlassSurface>
        <GlassSurface id="ordinary" glass={false}>
          Ordinary
        </GlassSurface>
      </>,
    );
    expect(tag(html, "enabled")).toContain('data-glass="true"');
    expect(tag(html, "ordinary")).not.toContain('data-glass="true"');
    expect(html).not.toContain("data-glass-intensity");
    expect(html).not.toContain("--glass-blur");
    expect(html).not.toContain("--glass-initial-blur");
    expect(html).not.toContain("<canvas");
  });
  test("plain layout and text allow independently enabled controls", () => {
    const html = renderToString(
      <Scope glass>
        <FieldSet id="text-fieldset">
          <FieldGroup id="text-fieldgroup">
            <Field id="text-field">
              <FieldLabel id="plain-fieldlabel" htmlFor="painted-input">
                Name
              </FieldLabel>
              <Input id="painted-input" />
            </Field>
          </FieldGroup>
          <ButtonGroup id="text-buttongroup">
            <ButtonGroupText
              id="plain-affix"
              render={<Label htmlFor="painted-input" />}
            >
              Name
            </ButtonGroupText>
            <Button id="painted-button">Save</Button>
          </ButtonGroup>
          <KbdGroup id="plain-keygroup">
            <Kbd id="painted-key">⌘</Kbd>
          </KbdGroup>
          <Marker id="plain-marker-link" render={<a href="/files" />}>
            View files
          </Marker>
          <Marker
            id="plain-marker-button"
            render={<button type="button" onClick={() => {}} />}
          >
            Show details
          </Marker>
        </FieldSet>
      </Scope>,
    );
    for (const id of [
      "text-fieldset",
      "text-fieldgroup",
      "text-field",
      "plain-fieldlabel",
      "plain-affix",
      "plain-keygroup",
      "painted-key",
      "plain-marker-link",
      "plain-marker-button",
    ])
      expect(tag(html, id)).not.toContain("data-glass=");
    // A button group is one capsule its buttons share; a field on its own in
    // the scope is a glass field.
    expect(tag(html, "text-buttongroup")).toContain('data-glass="true"');
    expect(tag(html, "text-buttongroup")).toContain('role="group"');
    expect(tag(html, "painted-button")).toContain('data-glass-part="control"');
    expect(tag(html, "painted-input")).toContain('data-glass="true"');
    expect(tag(html, "plain-fieldlabel")).toMatch(/^<label\b/);
    expect(tag(html, "plain-fieldlabel")).toContain('for="painted-input"');
    expect(tag(html, "plain-affix")).toMatch(/^<label\b/);
    expect(tag(html, "plain-affix")).toContain('for="painted-input"');
    expect(tag(html, "plain-marker-link")).toMatch(/^<a\b/);
    expect(tag(html, "plain-marker-link")).toContain('href="/files"');
    expect(tag(html, "plain-marker-button")).toMatch(/^<button\b/);
    expect(tag(html, "plain-marker-button")).toContain('type="button"');
  });
  test("server material respects zero tint opacity with built-in highlights", () => {
    const html = renderToString(
      <GlassSurface
        id="initial-options"
        glassConfig={{
          options: { tint: "#161617", tintOpacity: 0 },
        }}
        style={{ minHeight: 48 }}
      />,
    );
    const element = tag(html, "initial-options");
    expect(element).toContain("--glass-opacity:0%");
    expect(element).toContain("--glass-base:#161617");
    expect(element).not.toContain("--glass-edge");
    expect(element).not.toContain("--glass-initial-edge-shadow");
    expect(element).toContain("min-height:48px");
  });
  test("initial lighting follows native radius and suppresses glass focus rings", () => {
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
    const html = renderToString(<Button glass id="initial-button" />);
    expect(html).toMatch(/^<button\b/);
    expect(tag(html, "initial-button")).toContain('data-glass-state="loading"');
    expect(html).not.toContain("<svg");
  });
  test("scope enables one surface layer, explicit false overrides and explicit true nests deliberately", () => {
    const html = renderToString(
      <GlassContext.Provider
        value={{
          enabled: false,
          surface: false,
          configuration: {},
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
    const scopes = ["inherited", "surface", "explicit-nested"].map(
      (id) => tag(html, id).match(/data-glass-scope="([^"]+)"/)?.[1],
    );
    expect(scopes.every(Boolean)).toBe(true);
    expect(new Set(scopes).size).toBe(3);
    expect(scopes).not.toContain("shared-test-scope");
    expect(tag(html, "disabled-glass")).not.toContain("data-glass=");
    expect(tag(html, "surface")).toContain('data-glass="true"');
    expect(tag(html, "nested")).not.toContain("data-glass=");
    expect(tag(html, "nested")).toContain('data-glass-part="control"');
    expect(tag(html, "explicit-nested")).toContain('data-glass="true"');
    expect(html).toContain('data-glass-state="loading"');
    expect(html).not.toContain('data-glass-state="ready"');
  });
  test("form fields stay ordinary and keep their actions ordinary inside glass", () => {
    const html = renderToString(
      <GlassSurface>
        <Input id="nested-input" />
        <Surface id="content-wrapper">Content</Surface>
        <InputGroup id="group-material">
          <InputGroupInput id="group-input" />
          <InputGroupButton id="group-action">Clear</InputGroupButton>
        </InputGroup>
        <GlassSurface glass={false}>
          <Button id="plain-scope-button">Plain</Button>
        </GlassSurface>
      </GlassSurface>,
    );
    for (const id of [
      "nested-input",
      "group-material",
      "group-input",
      "group-action",
    ])
      expect(tag(html, id)).not.toContain("data-glass");
    for (const id of ["content-wrapper", "plain-scope-button"])
      expect(tag(html, id)).not.toContain("data-glass=");
  });
  test("tooltip trigger shares its container without a second material", () => {
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
    expect(tag(html, "tooltip-trigger")).not.toContain("data-glass=");
    expect(tag(html, "tooltip-trigger")).toContain('data-glass-part="control"');
  });
  test("menubar titles stay ordinary inside and outside glass", () => {
    const html = renderToString(
      <>
        <GlassSurface>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger id="inner-menu-trigger">File</MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        </GlassSurface>
        <GlassContext.Provider
          value={{ enabled: true, surface: false, configuration: {} }}
        >
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger id="outer-menu-trigger">Help</MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        </GlassContext.Provider>
      </>,
    );
    for (const id of ["inner-menu-trigger", "outer-menu-trigger"]) {
      expect(tag(html, id)).not.toContain("data-glass=");
      expect(tag(html, id)).not.toContain("data-glass-part=");
    }
  });
  test("QR shells use a real glass scope and leave the scanner image undecorated", () => {
    const html = renderToString(
      <GlassContext.Provider
        value={{
          enabled: true,
          surface: false,
          configuration: {},
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
    expect(tag(html, "card")).toContain("data-glass-scope=");
    expect(tag(html, "card")).not.toContain('data-glass-scope="qr-scope"');
    expect(tag(html, "code")).not.toContain("data-glass=");
    expect(tag(html, "plain-card")).not.toContain("data-glass=");
  });
  test("desktop and static sidebar preserve ordinary backgrounds and borders", () => {
    const desktop = renderToString(
      <SidebarProvider>
        <Sidebar id="desktop-sidebar">Navigation</Sidebar>
      </SidebarProvider>,
    );
    const painted = [...desktop.matchAll(/<\w+\b[^>]*>/g)]
      .map(([element]) => element)
      .find((element) => element.includes('data-slot="sidebar-inner"'));
    expect(painted).not.toContain("data-glass");
    expect(painted).toContain("bg-sidebar");
    expect(tag(desktop, "desktop-sidebar")).not.toContain("data-glass=");
    expect(tag(desktop, "desktop-sidebar")).not.toContain("border-transparent");
    expect(desktop).not.toContain("data-glass");
    const staticSidebar = renderToString(
      <SidebarProvider>
        <Sidebar collapsible="none" id="static-sidebar">
          Navigation
        </Sidebar>
      </SidebarProvider>,
    );
    expect(tag(staticSidebar, "static-sidebar")).not.toContain("data-glass");
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
