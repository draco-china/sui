import { describe, expect, test } from "bun:test";
import {
  SensitiveInput,
  type SensitiveInputProps,
} from "@workspace/ui/components/sensitive-input";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

function render(props: SensitiveInputProps = {}) {
  return renderToStaticMarkup(createElement(SensitiveInput, props));
}

function buttons(html: string) {
  return [...html.matchAll(/<button\b([^>]+)>/g)].map(
    (match) => match[1] ?? "",
  );
}

describe("Sensitive Input copy contract", () => {
  test("copy is enabled by default without revealing the input or submitting its form", () => {
    const html = render({
      id: "secret",
      name: "apiKey",
      defaultValue: "private-example-value",
      required: true,
    });
    expect(html).toContain('type="password"');
    expect(html).toContain('data-slot="sensitive-input-reveal"');
    expect(html).toContain("••••••••");
    expect(html).toMatch(/<input[^>]+tabindex="-1"/);
    expect(html).toMatch(/<input[^>]+aria-hidden="true"/);
    expect(html).toContain('name="apiKey"');
    expect(html).toContain('data-copy-status="idle"');
    expect(html).toContain('aria-label="Copy to clipboard"');
    expect(html).toContain('aria-label="Show value"');
    const actions = buttons(html);
    expect(actions).toHaveLength(3);
    for (const action of actions) {
      expect(action).toContain('type="button"');
      expect(action).toContain('aria-controls="secret"');
      expect(action).not.toMatch(/\bdisabled(?:=|\s|$)/);
    }
    expect(html.replace(/<[^>]*>/g, "")).not.toContain("private-example-value");
  });

  test("empty values are directly editable without a mask and preserve the native input", () => {
    const html = render({
      defaultValue: "",
      placeholder: "Enter a value",
      name: "secret",
    });
    expect(html).toContain('type="password"');
    expect(html).toContain('placeholder="Enter a value"');
    expect(html).not.toContain('data-slot="sensitive-input-reveal"');
    expect(html).not.toMatch(/<input[^>]+readOnly=""/);
    expect(html).not.toMatch(/<input[^>]+aria-hidden="true"/);
    expect(buttons(html)).toHaveLength(2);
  });

  test("fixed masking does not expose the length of the value", () => {
    const short = render({ defaultValue: "x", copyable: false });
    const long = render({
      defaultValue: "a-longer-private-example",
      copyable: false,
    });
    expect(short.replace(/<[^>]*>/g, "")).toBe(long.replace(/<[^>]*>/g, ""));
  });

  test("copyable false preserves the visibility control and removes copy feedback", () => {
    const html = render({ copyable: false, defaultVisible: true });
    expect(buttons(html)).toHaveLength(1);
    expect(html).toContain('type="text"');
    expect(html).toContain('aria-label="Hide value"');
    expect(html).not.toContain('data-slot="sensitive-input-copy"');
    expect(html).not.toContain("data-copy-status=");
    expect(html).not.toContain('role="status"');
  });

  test("read-only inputs keep actions enabled while disabled inputs disable both actions", () => {
    const readOnly = render({ readOnly: true, defaultValue: "read-only" });
    expect(readOnly).toMatch(/<input[^>]+readOnly=""/);
    for (const action of buttons(readOnly)) {
      expect(action).not.toMatch(/\bdisabled(?:=|\s|$)/);
    }
    const disabled = render({ disabled: true, defaultValue: "disabled" });
    expect(disabled).toMatch(/<input[^>]+disabled=""/);
    for (const action of buttons(disabled)) {
      expect(action).toContain('disabled=""');
    }
  });

  test("localized copy labels coexist with native input props and native onCopy", () => {
    const html = render({
      value: "controlled-example",
      onChange: () => {},
      onCopy: (event) => event.preventDefault(),
      onCopySuccess: (value) => expect(typeof value).toBe("string"),
      onCopyError: (error) => expect(error).toBeInstanceOf(Error),
      resetDelay: 2000,
      form: "credentials",
      "aria-describedby": "hint",
      labels: {
        copy: "复制密钥",
        copied: "已复制",
        pending: "正在复制",
        failed: "复制失败",
        show: "显示密钥",
        hide: "隐藏密钥",
      },
    });
    expect(html).toContain('aria-label="复制密钥"');
    expect(html).toContain('aria-label="显示密钥"');
    expect(html).toContain('form="credentials"');
    expect(html).toContain('aria-describedby="hint"');
    expect(html).not.toMatch(/\s(?:copyable|resetDelay|onCopySuccess|labels)=/);
  });
});
