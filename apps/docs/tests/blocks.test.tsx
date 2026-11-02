import { expect, test } from "bun:test";
import { ProfileForm } from "@workspace/ui/blocks/tanstack-form";
import { NavigationProgress } from "@workspace/ui/components/navigation-progress";
import { renderToString } from "react-dom/server";

test("multiple shared forms generate independent labels and do not submit during SSR", () => {
  const html = renderToString(
    <>
      <ProfileForm
        onSubmit={() => {
          throw new Error("Must not submit on SSR");
        }}
      />
      <ProfileForm
        onSubmit={() => {
          throw new Error("Must not submit on SSR");
        }}
      />
    </>,
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
});

test("navigation feedback is hidden and stable before client navigation", () => {
  const html = renderToString(
    <NavigationProgress active={false} label="正在加载页面" />,
  );
  expect(html).toContain('hidden=""');
  expect(html).toContain('data-state="idle"');
  expect(html).toContain('aria-label="正在加载页面"');
  expect(html).toContain("motion-reduce:transition-none");
});
