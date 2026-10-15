import type { Locale } from "../lib/i18n";
import { GlassLab } from "./glass-lab";
import { SiteHeader } from "./site-header";

export function GlassPlayground({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  return (
    <div
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
      data-slot="playground"
    >
      <a
        className="home-skip-link bg-background text-foreground"
        href="#playground-main"
      >
        {zh ? "跳至组件体验" : "Skip to playground"}
      </a>
      <SiteHeader locale={locale} />
      <main
        id="playground-main"
        className="min-h-0 flex-1 px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6"
        aria-label={zh ? "组件体验" : "Component playground"}
      >
        <GlassLab locale={locale} />
      </main>
    </div>
  );
}
