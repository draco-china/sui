import { describe, expect, test } from "bun:test";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@workspace/ui/components/attachment";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from "@workspace/ui/components/bubble";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Empty, EmptyContent } from "@workspace/ui/components/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { Item, ItemTitle } from "@workspace/ui/components/item";
import { Kbd } from "@workspace/ui/components/kbd";
import { Message, MessageAvatar } from "@workspace/ui/components/message";
import {
  Progress,
  ProgressLabel,
  ProgressTrack,
} from "@workspace/ui/components/progress";
import { QRCode } from "@workspace/ui/components/qr-code";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";
import type { ComponentProps, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GlassContext } from "../../../packages/ui/src/lib/glass/context";

const plainComponents = {
  Kbd,
  Field,
  FieldGroup,
  FieldSet,
  ButtonGroup,
  Collapsible,
  ResizableHandle,
  Avatar,
  AvatarGroup,
  AvatarFallback,
  AvatarBadge,
  AvatarGroupCount,
  MessageAvatar,
  Badge,
  Progress,
  ProgressTrack,
  Table,
  Empty,
  Item,
  Alert,
  BubbleGroup,
  BubbleContent,
  QRCode,
};

// Type checking rejects reintroducing a Glass prop on these public components.
const noGlassApis: {
  [Name in keyof typeof plainComponents]: "glass" extends keyof ComponentProps<
    (typeof plainComponents)[Name]
  >
    ? true
    : false;
} = {
  Kbd: false,
  Field: false,
  FieldGroup: false,
  FieldSet: false,
  ButtonGroup: false,
  Collapsible: false,
  ResizableHandle: false,
  Avatar: false,
  AvatarGroup: false,
  AvatarFallback: false,
  AvatarBadge: false,
  AvatarGroupCount: false,
  MessageAvatar: false,
  Badge: false,
  Progress: false,
  ProgressTrack: false,
  Table: false,
  Empty: false,
  Item: false,
  Alert: false,
  BubbleGroup: false,
  BubbleContent: false,
  QRCode: false,
};

function ambient(children: ReactNode, surface = false) {
  return (
    <GlassContext.Provider
      value={{
        enabled: true,
        surface,
        configuration: {},
      }}
    >
      {children}
    </GlassContext.Provider>
  );
}

function tag(html: string, id: string) {
  const element = [...html.matchAll(/<\w+\b[^>]*>/g)]
    .map(([value]) => value)
    .find((value) => value.includes(`id="${id}"`));
  expect(element).toBeDefined();
  return element ?? "";
}

function expectPlain(html: string) {
  expect(html).not.toContain("data-glass=");
  expect(html).not.toMatch(/\sglass=/);
}

describe("Glass stays on interaction surfaces instead of text and content", () => {
  test("removed public APIs no longer accept glass", () => {
    expect(Object.values(noGlassApis).every((value) => value === false)).toBe(
      true,
    );
  });

  test("layout wrappers preserve semantics and do not interrupt independent controls", () => {
    const html = renderToStaticMarkup(
      ambient(
        <FieldSet id="fieldset">
          <FieldGroup id="field-group">
            <Field id="field">
              <FieldLabel htmlFor="field-input">Name</FieldLabel>
              <Input id="field-input" />
            </Field>
          </FieldGroup>
          <ButtonGroup id="button-group">
            <Button id="save">Save</Button>
          </ButtonGroup>
          <Collapsible id="collapsible" defaultOpen>
            <CollapsibleTrigger render={<Button id="collapse-control" />}>
              Details
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Kbd id="key">⌘</Kbd>
            </CollapsibleContent>
          </Collapsible>
        </FieldSet>,
      ),
    );
    for (const id of [
      "fieldset",
      "field-group",
      "field",
      "button-group",
      "collapsible",
      "key",
    ])
      expect(tag(html, id)).not.toContain("data-glass=");
    for (const id of ["field-input", "save", "collapse-control"])
      expect(tag(html, id)).toContain('data-glass="true"');
    expect(tag(html, "fieldset")).toMatch(/^<fieldset\b/);
    expect(html).toContain('for="field-input"');
    expect(tag(html, "key")).toMatch(/^<kbd\b/);
    expect(tag(html, "button-group")).toContain('role="group"');
  });

  test("avatar, status and resize parts have no independent material in an enabled scope", () => {
    const html = renderToStaticMarkup(
      ambient(
        <>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
              <AvatarBadge />
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
          <Badge render={<a href="/status" />}>Ready</Badge>
          <Progress value={42}>
            <ProgressLabel>Upload</ProgressLabel>
          </Progress>
          <Message>
            <MessageAvatar>AB</MessageAvatar>
          </Message>
          <ResizablePanelGroup>
            <ResizablePanel defaultSize="50%">First</ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="50%">Second</ResizablePanel>
          </ResizablePanelGroup>
        </>,
      ),
    );
    expectPlain(html);
    expect(html).toContain('href="/status"');
    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain("bg-primary");
    expect(html).toContain('data-slot="resizable-handle"');
  });

  test("content primitives retain their ordinary classes, semantic variants and custom renders", () => {
    const html = renderToStaticMarkup(
      ambient(
        <>
          <Alert variant="destructive" role="alert">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Retry later</AlertDescription>
          </Alert>
          <Empty>
            <EmptyContent>No projects</EmptyContent>
          </Empty>
          <Item variant="outline" render={<a href="/project" />}>
            <ItemTitle>Project</ItemTitle>
          </Item>
          <BubbleGroup>
            <Bubble variant="default">
              <BubbleContent render={<a href="/message" />}>
                Message
              </BubbleContent>
            </Bubble>
          </BubbleGroup>
          <Table id="content-table">
            <TableBody>
              <TableRow>
                <TableCell>Readable data</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>,
      ),
    );
    expectPlain(html);
    expect(html).toContain('role="alert"');
    expect(html).toContain("text-destructive");
    expect(html).toContain("border-border");
    expect(html).toContain('href="/project"');
    expect(html).toContain('href="/message"');
    expect(tag(html, "content-table")).toMatch(/^<table\b/);
    expect(html).toContain("Readable data");
  });

  test("QR code keeps its opaque reading area in an enabled scope and a parent surface", () => {
    for (const parent of [false, true]) {
      const content = (
        <QRCode id="code" value="connect:studio" render={<section />} />
      );
      const html = renderToStaticMarkup(
        ambient(parent ? <GlassSurface>{content}</GlassSurface> : content),
      );
      expect(tag(html, "code")).not.toContain("data-glass=");
      expect(tag(html, "code")).toMatch(/^<section\b/);
      const body = [...html.matchAll(/<\w+\b[^>]*>/g)]
        .map(([value]) => value)
        .find((value) => value.includes('data-slot="qr-code-content"'));
      expect(body).toContain("bg-card");
      expect(body).not.toContain("bg-transparent");
      expect(html.match(/data-glass="true"/g)?.length ?? 0).toBe(
        parent ? 1 : 0,
      );
    }
  });

  test("Attachment paints only actions and isolates controls placed inside media or content", () => {
    const html = renderToStaticMarkup(
      <Attachment glass id="attachment">
        <AttachmentMedia id="media">
          <Button id="media-button">Image control</Button>
        </AttachmentMedia>
        <AttachmentContent id="content">
          <AttachmentTitle>File</AttachmentTitle>
          <Button id="content-button">Content control</Button>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction id="remove" aria-label="Remove" />
          <AttachmentAction
            glass={false}
            id="plain-action"
            aria-label="Plain"
          />
        </AttachmentActions>
      </Attachment>,
    );
    for (const id of [
      "attachment",
      "media",
      "content",
      "media-button",
      "content-button",
      "plain-action",
    ])
      expect(tag(html, id)).not.toContain("data-glass=");
    expect(tag(html, "remove")).toContain('data-glass="true"');
    expect(tag(html, "remove")).toContain('aria-label="Remove"');
    expect(tag(html, "attachment")).toContain("bg-card");
    expect(html.match(/data-glass="true"/g)).toHaveLength(1);
  });

  test("Attachment explicit opt-out overrides ambient glass without altering actions", () => {
    const html = renderToStaticMarkup(
      ambient(
        <Attachment glass={false} state="error">
          <AttachmentContent>
            <AttachmentTitle>Upload failed</AttachmentTitle>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Retry" />
          </AttachmentActions>
        </Attachment>,
      ),
    );
    expectPlain(html);
    expect(html).toContain('data-state="error"');
    expect(html).toContain('aria-label="Retry"');
  });
});
