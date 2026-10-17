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
import { withGlass } from "../../../packages/ui/src/lib/glass/with-glass";
import { describeFixture } from "./support/fixture";

function Element(props: ComponentProps<"div">) {
  return <div {...props} />;
}
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
  test("plain layout and text stay ordinary beside explicit glass controls", () => {
    const html = renderToString(
      <div>
        <FieldSet id="text-fieldset">
          <FieldGroup id="text-fieldgroup">
            <Field id="text-field">
              <FieldLabel id="plain-fieldlabel" htmlFor="painted-input">
                Name
              </FieldLabel>
              <Input id="painted-input" glass />
            </Field>
          </FieldGroup>
          <ButtonGroup id="text-buttongroup" glass>
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
      </div>,
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
      "painted-button",
    ])
      expect(tag(html, id)).not.toContain("data-glass");
    // A button group is one capsule its buttons sit on; the field asked for
    // glass itself.
    expect(tag(html, "text-buttongroup")).toContain('data-glass="true"');
    expect(tag(html, "text-buttongroup")).toContain('role="group"');
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
        glass={{
          tint: "#161617",
          tintOpacity: 0,
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
  test("glass is never inherited: only components that ask are glass", () => {
    const html = renderToString(
      <Surface glass id="surface">
        <Button id="inner" type="button">
          Ordinary
        </Button>
        <Button id="explicit" type="button" glass>
          Own glass
        </Button>
        <Button id="frosted" type="button" frosted>
          Frosted
        </Button>
        <Button id="both" type="button" glass frosted>
          Clear wins
        </Button>
      </Surface>,
    );
    expect(tag(html, "surface")).toContain('data-glass="true"');
    expect(tag(html, "inner")).not.toContain("data-glass");
    expect(tag(html, "inner")).not.toContain("data-frosted");
    expect(tag(html, "explicit")).toContain('data-glass="true"');
    expect(tag(html, "frosted")).toContain('data-frosted="true"');
    expect(tag(html, "frosted")).not.toContain("data-glass");
    expect(tag(html, "both")).toContain('data-glass="true"');
    expect(tag(html, "both")).not.toContain("data-frosted");
    const scopes = ["surface", "explicit", "both"].map(
      (id) => tag(html, id).match(/data-glass-scope="([^"]+)"/)?.[1],
    );
    expect(scopes.every(Boolean)).toBe(true);
    expect(new Set(scopes).size).toBe(3);
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
  test("a tooltip trigger stays ordinary inside glass", () => {
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
    expect(tag(html, "tooltip-trigger")).not.toContain("data-glass");
  });
  test("menubar titles stay ordinary inside glass", () => {
    const html = renderToString(
      <GlassSurface>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger id="inner-menu-trigger">File</MenubarTrigger>
          </MenubarMenu>
        </Menubar>
      </GlassSurface>,
    );
    expect(tag(html, "inner-menu-trigger")).not.toContain("data-glass");
  });
  test("QR shells use a real glass scope and leave the scanner image undecorated", () => {
    const html = renderToString(
      <>
        <GlassSurface id="card">
          <QRCode id="code" value="connect:studio" />
        </GlassSurface>
        <GlassSurface id="plain-card" glass={false}>
          <QRCode value="connect:studio" />
        </GlassSurface>
      </>,
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
  test("navigation menu glass reaches its popup, not the root or triggers", () => {
    const html = renderToString(
      <NavigationMenu glass id="navigation">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger id="navigation-trigger">
              Products
            </NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuItem value="docs">
            <NavigationMenuTrigger id="glass-trigger" glass>
              Docs
            </NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(tag(html, "navigation")).not.toContain("data-glass");
    expect(tag(html, "navigation-trigger")).not.toContain("data-glass");
    expect(tag(html, "glass-trigger")).toContain('data-glass="true"');
  });
  describeFixture(
    "Isolated DOM keeps native refs, forms, leases and fallback behavior",
    "glass-dom.tsx",
  );
});
