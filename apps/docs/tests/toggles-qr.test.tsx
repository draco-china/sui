import { describe, expect, test } from "bun:test";
import { GlassSurface } from "@workspace/ui/components/glass";
import { LocaleToggle } from "@workspace/ui/components/locale-toggle";
import { QRCode } from "@workspace/ui/components/qr-code";
import { ThemeIcon, ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { renderToString } from "react-dom/server";

const locales = [
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "简体中文" },
] as const;

describe("SSR-safe controlled toggles", () => {
  test("explicit appearance menus can share stable Sun, Moon and System icon endpoints", () => {
    const paths = (["light", "dark", "system"] as const).map((theme) => {
      const html = renderToString(<ThemeIcon theme={theme} />);
      expect(html).toContain('width="16"');
      expect(html).toContain('stroke-width="2"');
      expect(html).toContain("size-4");
      expect(html).toContain(`data-theme="${theme}"`);
      return html.match(/<path[^>]+d="([^"]+)"/)?.[1];
    });
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(3);
  });
  test("theme target labels and pressed state match its controlled appearance", () => {
    for (const variant of [
      "rectangle",
      "circle",
      "circle-blur",
      "blinds",
    ] as const) {
      const html = renderToString(
        <ThemeToggle
          theme="dark"
          variant={variant}
          start="button"
          onThemeChange={() => {
            throw new Error("SSR must not change theme");
          }}
          lightLabel="切换到浅色"
        />,
      );
      expect(html).toContain('aria-label="切换到浅色"');
      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('type="button"');
      expect(html).toContain('data-slot="theme-toggle"');
    }
    const light = renderToString(
      <ThemeToggle theme="light" onThemeChange={() => {}} />,
    );
    expect(light).toContain('aria-label="Switch to dark mode"');
    expect(light).toContain('aria-pressed="false"');
  });
  test("theme custom composition and disabled state stay intact", () => {
    const html = renderToString(
      <ThemeToggle
        theme="light"
        onThemeChange={() => {}}
        disabled
        render={<button type="button" data-composed="true" />}
        lightIcon={<span>Light</span>}
        darkIcon={<span>Dark</span>}
      />,
    );
    expect(html).toContain('data-composed="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Light");
    expect(html).toContain("Dark");
  });
  test("two languages render a compact non-submitting toggle naming its next language", () => {
    const html = renderToString(
      <LocaleToggle
        value="en-US"
        options={locales}
        label="切换语言"
        onValueChange={() => {
          throw new Error("SSR must not change locale");
        }}
      />,
    );
    expect(html).toContain('aria-label="切换语言: 简体中文"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('type="button"');
    expect(html).not.toContain('role="combobox"');
  });
  test("multiple languages render the shared accessible select", () => {
    const html = renderToString(
      <LocaleToggle
        value="fr-FR"
        options={[...locales, { value: "fr-FR", label: "Français" }]}
        onValueChange={() => {}}
        type="submit"
      />,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="Change language: Français"');
    expect(html).toContain('type="button"');
    expect(html).not.toContain('type="submit"');
  });
  test("empty, single and duplicate language sets cannot activate a redundant cycle", () => {
    for (const options of [[], [locales[0]], [locales[0], locales[0]]]) {
      const html = renderToString(
        <LocaleToggle
          value="en-US"
          options={options}
          onValueChange={() => {}}
        />,
      );
      expect(html).toContain('disabled=""');
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("NaN");
    }
  });
});

describe("QR code asynchronous SSR boundary", () => {
  test("SSR exposes a labeled dot-matrix placeholder without browser image generation", () => {
    const html = renderToString(
      <QRCode value="https://example.com" label="访问示例" size={192} />,
    );
    expect(html).toContain('data-state="loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="访问示例"');
    expect(html).toContain('data-slot="qr-code-loading"');
    expect(html).toContain("<canvas");
    expect(html).toContain("<pattern");
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain("text-foreground/12");
    expect(html).toContain("text-foreground");
    expect(html).toMatch(/data-slot="qr-code-content"[^>]*bg-card/);
    expect(html).not.toContain("bg-white");
    expect(html).not.toContain("text-black");
    expect(html).not.toContain('data-slot="skeleton"');
    expect(html).not.toContain('data-slot="loader"');
    expect(html).not.toContain("Preparing QR");
    expect(html).not.toContain("loadingLabel");
    expect(html).not.toContain("errorLabel");
    expect(html).toContain("width:192px");
    expect(html).toContain("max-width:100%");
    expect(html).not.toContain("blob:");
    expect(html).not.toContain("https://example.com");
  });
  test("optional QR glass uses a full shared background behind transparent code content", () => {
    const html = renderToString(<QRCode glass value="connect:workspace" />);
    expect(html).toMatch(/data-glass="(?:true)?"/);
    expect(html).toContain('data-slot="qr-code-content"');
    expect(html).not.toContain("inset-2");
    expect(html).toMatch(/data-slot="qr-code-content"[^>]*bg-transparent/);
    expect(html).toContain("text-foreground");
    expect(html).not.toContain("<mask");
    expect(html).toContain('aria-busy="true"');
  });
  test("plain QR retains its solid neutral background inside an outer glass layout", () => {
    const html = renderToString(
      <GlassSurface glass>
        <QRCode value="connect:workspace" />
      </GlassSurface>,
    );
    expect(html).toMatch(/data-glass="(?:true)?"/);
    expect(html).toMatch(/data-slot="qr-code-content"[^>]*bg-card/);
    expect(html).toContain("text-foreground");
    expect(html).not.toContain('data-slot="qr-code-image"');
  });
});
