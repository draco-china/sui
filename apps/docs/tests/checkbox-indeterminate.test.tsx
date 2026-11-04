import { describe, expect, test } from "bun:test";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { renderToString } from "react-dom/server";

describe("checkbox", () => {
  test("an indeterminate box shows a dash, not a check", () => {
    const html = renderToString(<Checkbox indeterminate />);
    expect(html).toContain("lucide-minus");
    expect(html).not.toContain("lucide-check");
    expect(html).toContain("data-indeterminate");
  });

  test("a checked box keeps its check", () => {
    const html = renderToString(<Checkbox checked />);
    expect(html).toContain("lucide-check");
  });
});
