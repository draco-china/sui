import { describe, expect, test } from "bun:test";
import { CopyText } from "@workspace/ui/components/copy-text";
import { renderToString } from "react-dom/server";

describe("inline copy text composition", () => {
  test("is a non-submitting inline button with accessible feedback and no press movement", () => {
    const html = renderToString(<CopyText>bun run dev</CopyText>);
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
      <CopyText
        value="/workspace/projects/studio"
        variant="muted"
        size="sm"
        truncate={false}
        labels={{ copy: "复制完整路径", copied: "已复制" }}
      >
        <span>projects/…</span>
      </CopyText>,
    );
    expect(html).toContain('aria-label="复制完整路径"');
    expect(html).toContain("projects/…");
    expect(html).not.toContain("/workspace/projects/studio");
    expect(html).not.toContain('value="');
  });

  test("requires an explicit value for rich content", () => {
    expect(() =>
      renderToString(
        <CopyText>
          <span>Display name</span>
        </CopyText>,
      ),
    ).toThrow("CopyText requires value");
  });

  test("keeps Base UI render composition, disabled semantics and SSR free of copy callbacks", () => {
    let copied = false;
    let failed = false;
    const html = renderToString(
      <CopyText
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
      </CopyText>,
    );
    expect(html).toContain('data-composed="true"');
    expect(html).toContain('aria-label="Workspace ID"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('type="button"');
    expect(copied).toBe(false);
    expect(failed).toBe(false);
  });
});
