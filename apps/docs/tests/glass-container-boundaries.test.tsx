import { expect, test } from "bun:test";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import {
  Sidebar,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Toolbar, ToolbarButton } from "@workspace/ui/components/toolbar";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import {
  GlassContext,
  withGlass,
} from "../../../packages/ui/src/lib/glass/context";

function tag(html: string, id: string) {
  return (
    [...html.matchAll(/<\w+\b[^>]*>/g)]
      .map(([element]) => element)
      .find((element) => element.includes(`id="${id}"`)) ?? ""
  );
}

test("ColorPicker inherits action material and respects explicit local switches", () => {
  const Scope = withGlass(
    (props: ComponentProps<"div">) => <div {...props} />,
    "scope",
  );
  for (const enabled of [false, true]) {
    const html = renderToString(
      <Scope glass={enabled}>
        <ColorPicker id="inherited-picker" eyeDropper={false} />
        <ColorPicker id="plain-picker" glass={false} eyeDropper={false} />
        <ColorPicker id="local-picker" glass eyeDropper={false} />
        <ColorPicker inline eyeDropper={false} />
      </Scope>,
    );
    expect(tag(html, "inherited-picker").includes('data-glass="true"')).toBe(
      enabled,
    );
    expect(tag(html, "plain-picker")).not.toContain("data-glass=");
    expect(tag(html, "local-picker")).toContain('data-glass="true"');
    expect(html.match(/data-glass="true"/g)).toHaveLength(Number(enabled) + 1);
  }
});

const enabledScope = { enabled: true, surface: false } as const;

test("Accordion and its rows stay ordinary inside enabled glass", () => {
  const html = renderToString(
    <GlassContext.Provider value={enabledScope}>
      <Accordion defaultValue={["first"]}>
        <AccordionItem id="row" value="first">
          <AccordionTrigger id="trigger">First</AccordionTrigger>
          <AccordionContent>
            <Button id="inner-action">Inner</Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </GlassContext.Provider>,
  );
  expect(html).not.toContain("data-glass");
  expect(tag(html, "trigger")).toContain('aria-expanded="true"');
  expect(tag(html, "trigger")).toContain("focus-visible:ring-3");
});

test("Card content stays ordinary while Toolbar paints once with its actions", () => {
  const card = renderToString(
    <GlassContext.Provider value={enabledScope}>
      <Card>
        <Button id="card-button">Inherited</Button>
        <Input id="card-input" />
        <Button id="card-explicit" glass>
          Explicit
        </Button>
      </Card>
    </GlassContext.Provider>,
  );
  // Cards are content; only an explicit opt-in inside them becomes glass.
  expect(tag(card, "card-button")).not.toContain("data-glass");
  expect(tag(card, "card-input")).not.toContain("data-glass");
  expect(tag(card, "card-explicit")).toContain('data-glass="true"');
  expect(card.match(/data-glass="true"/g)).toHaveLength(1);
  const toolbar = renderToString(
    <Toolbar glass>
      <ToolbarButton id="action">Save</ToolbarButton>
      <Button id="plain-button" glass={false}>
        Ordinary
      </Button>
      <Button id="independent-button" glass>
        Independent
      </Button>
    </Toolbar>,
  );
  expect(toolbar.match(/data-glass="true"/g)).toHaveLength(2);
  expect(tag(toolbar, "action")).toContain('data-glass-part="control"');
  expect(tag(toolbar, "plain-button")).not.toContain("data-glass-part=");
  expect(tag(toolbar, "independent-button")).toContain('data-glass="true"');
});

test("InputGroup is one glass field in an enabled scope and ordinary inside a surface", () => {
  const group = (
    <InputGroup id="group">
      <InputGroupInput id="group-input" />
      <InputGroupTextarea id="group-textarea" />
      <InputGroupButton id="group-action">Action</InputGroupButton>
    </InputGroup>
  );
  const html = renderToString(
    <GlassContext.Provider value={enabledScope}>{group}</GlassContext.Provider>,
  );
  // Like an iOS search field: one capsule whose controls share it.
  expect(tag(html, "group")).toContain('data-glass="true"');
  expect(tag(html, "group-input")).not.toContain("data-glass");
  expect(tag(html, "group-textarea")).not.toContain("data-glass");
  expect(tag(html, "group-action")).toContain('data-glass-part="control"');
  // Inside a glass surface, the field and its actions stay ordinary and keep
  // their focus rings.
  const nested = renderToString(
    <GlassContext.Provider value={{ enabled: true, surface: true }}>
      {group}
    </GlassContext.Provider>,
  );
  expect(nested).not.toContain("data-glass");
  expect(tag(nested, "group-action")).toContain("focus-visible:ring-3");
});

test("Tabs paint the list while panels remain ordinary", () => {
  const html = renderToString(
    <Tabs glass defaultValue="first">
      <TabsList id="list">
        <TabsTrigger value="first">First</TabsTrigger>
      </TabsList>
      <TabsContent id="panel" value="first">
        Panel
      </TabsContent>
    </Tabs>,
  );
  expect(tag(html, "list")).toContain('data-glass="true"');
  expect(tag(html, "panel")).not.toContain("data-glass");
  expect(html.match(/data-glass="true"/g)).toHaveLength(1);
});

test("Sidebar navigation stays ordinary inside an enabled material scope", () => {
  const html = renderToString(
    <GlassContext.Provider value={{ enabled: true, surface: false }}>
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton id="nav">Home</SidebarMenuButton>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton id="sub-nav" href="/settings">
                    Settings
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
        <SidebarInset id="page">Page</SidebarInset>
      </SidebarProvider>
    </GlassContext.Provider>,
  );
  expect(html).not.toContain("data-glass");
  expect(tag(html, "nav")).not.toContain("data-glass");
  expect(tag(html, "sub-nav")).not.toContain("data-glass");
  expect(tag(html, "sub-nav")).toContain('href="/settings"');
  expect(tag(html, "page")).not.toContain("data-glass");
});

test("portal boundaries retain an independent material inside a container", () => {
  const Popup = withGlass(
    (props: ComponentProps<"div">) => <div {...props} />,
    "portal",
  );
  const html = renderToString(
    <GlassSurface>
      <InputGroup id="embedded-control">
        <Popup id="popup">
          <Button id="popup-action">Action</Button>
        </Popup>
      </InputGroup>
      <Popup id="plain-popup" glass={false}>
        <Button id="plain-popup-action">Plain</Button>
      </Popup>
    </GlassSurface>,
  );
  expect(tag(html, "popup")).toContain('data-glass="true"');
  expect(tag(html, "popup-action")).toContain('data-glass-part="control"');
  expect(tag(html, "plain-popup")).not.toContain("data-glass");
  expect(tag(html, "plain-popup-action")).not.toContain("data-glass");
});
