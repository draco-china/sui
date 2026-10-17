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
import { renderToString } from "react-dom/server";

function tag(html: string, id: string) {
  return (
    [...html.matchAll(/<\w+\b[^>]*>/g)]
      .map(([element]) => element)
      .find((element) => element.includes(`id="${id}"`)) ?? ""
  );
}

test("ColorPicker glass reaches its trigger only when asked", () => {
  const html = renderToString(
    <>
      <ColorPicker id="plain-picker" eyeDropper={false} />
      <ColorPicker id="glass-picker" glass eyeDropper={false} />
      <ColorPicker id="frosted-picker" frosted eyeDropper={false} />
      <ColorPicker inline eyeDropper={false} />
    </>,
  );
  expect(tag(html, "plain-picker")).not.toContain("data-glass");
  expect(tag(html, "glass-picker")).toContain('data-glass="true"');
  expect(tag(html, "frosted-picker")).toContain('data-frosted="true"');
  expect(html.match(/data-glass="true"/g)).toHaveLength(1);
});

test("Accordion and its rows stay ordinary inside glass", () => {
  const html = renderToString(
    <GlassSurface id="surface">
      <Accordion defaultValue={["first"]}>
        <AccordionItem id="row" value="first">
          <AccordionTrigger id="trigger">First</AccordionTrigger>
          <AccordionContent>
            <Button id="inner-action">Inner</Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </GlassSurface>,
  );
  expect(html.match(/data-glass="true"/g)).toHaveLength(1);
  expect(tag(html, "row")).not.toContain("data-glass");
  expect(tag(html, "inner-action")).not.toContain("data-glass");
  expect(tag(html, "trigger")).toContain('aria-expanded="true"');
  expect(tag(html, "trigger")).toContain("focus-visible:ring-3");
});

test("Card content stays ordinary while a glass Toolbar paints once", () => {
  const card = renderToString(
    <Card glass>
      <Button id="card-button">Ordinary</Button>
      <Input id="card-input" />
    </Card>,
  );
  expect(tag(card, "card-button")).not.toContain("data-glass");
  expect(tag(card, "card-input")).not.toContain("data-glass");
  expect(card.match(/data-glass="true"/g)).toHaveLength(1);
  const toolbar = renderToString(
    <Toolbar glass>
      <ToolbarButton id="action">Save</ToolbarButton>
      <Button id="plain-button">Ordinary</Button>
    </Toolbar>,
  );
  expect(toolbar.match(/data-glass="true"/g)).toHaveLength(1);
  expect(tag(toolbar, "action")).not.toContain("data-glass");
  expect(tag(toolbar, "plain-button")).not.toContain("data-glass");
});

test("InputGroup with glass is one glass field whose controls stay ordinary", () => {
  const html = renderToString(
    <InputGroup id="group" glass>
      <InputGroupInput id="group-input" />
      <InputGroupTextarea id="group-textarea" />
      <InputGroupButton id="group-action">Action</InputGroupButton>
    </InputGroup>,
  );
  // Like an iOS search field: one capsule its controls sit on.
  expect(tag(html, "group")).toContain('data-glass="true"');
  for (const id of ["group-input", "group-textarea", "group-action"])
    expect(tag(html, id)).not.toContain("data-glass");
  expect(tag(html, "group-action")).toContain("focus-visible:ring-3");
});

test("Tabs paint only a list that asks, while panels remain ordinary", () => {
  const html = renderToString(
    <Tabs defaultValue="first">
      <TabsList id="list" glass>
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

test("Sidebar navigation stays ordinary inside glass", () => {
  const html = renderToString(
    <GlassSurface>
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
    </GlassSurface>,
  );
  expect(html.match(/data-glass="true"/g)).toHaveLength(1);
  expect(tag(html, "nav")).not.toContain("data-glass");
  expect(tag(html, "sub-nav")).not.toContain("data-glass");
  expect(tag(html, "sub-nav")).toContain('href="/settings"');
  expect(tag(html, "page")).not.toContain("data-glass");
});
