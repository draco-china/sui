import { describe, expect, test } from "bun:test";
import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import { renderToString } from "react-dom/server";

describe("inline copy text composition", () => {
  test("is a non-submitting inline button with accessible feedback and no press movement", () => {
    const html = renderToString(<InlineCopyText>bun run dev</InlineCopyText>);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Copy bun run dev"');
    expect(html).toContain('data-copy-status="idle"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(
      /(?:active:[^" ]*(?:scale|translate)|transition-\[.*transform)/,
    );
  });

  test("accepts rich display content and an independent value without leaking it into markup", () => {
    const html = renderToString(
      <InlineCopyText
        value="/workspace/projects/studio"
        variant="muted"
        size="sm"
        truncate={false}
        labels={{ copy: "复制完整路径", copied: "已复制" }}
      >
        <span>projects/…</span>
      </InlineCopyText>,
    );
    expect(html).toContain('aria-label="复制完整路径"');
    expect(html).toContain("projects/…");
    expect(html).not.toContain("/workspace/projects/studio");
    expect(html).not.toContain('value="');
  });

  test("requires an explicit value for rich content", () => {
    expect(() =>
      renderToString(
        <InlineCopyText>
          <span>Display name</span>
        </InlineCopyText>,
      ),
    ).toThrow("InlineCopyText requires value");
  });

  test("keeps Base UI render composition, disabled semantics and SSR free of copy callbacks", () => {
    let copied = false;
    let failed = false;
    const html = renderToString(
      <InlineCopyText
        render={<button type="button" data-composed="true" />}
        disabled
        aria-label="Workspace ID"
        onCopy={() => {
          copied = true;
        }}
        onCopyError={() => {
          failed = true;
        }}
      >
        workspace_72c31
      </InlineCopyText>,
    );
    expect(html).toContain('data-composed="true"');
    expect(html).toContain('aria-label="Workspace ID"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('type="button"');
    expect(copied).toBe(false);
    expect(failed).toBe(false);
  });
});
