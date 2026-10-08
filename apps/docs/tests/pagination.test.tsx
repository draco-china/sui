import { describe, expect, test } from "bun:test";
import {
  Pagination,
  PaginationContent,
  PaginationControls,
  PaginationInfo,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPageSize,
  PaginationPrevious,
  type PaginationRangeInfo,
  PaginationSeparator,
} from "@workspace/ui/components/pagination";
import { renderToString } from "react-dom/server";

function buttons(html: string) {
  return [...html.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag);
}
function button(html: string, label: string) {
  return (
    buttons(html).find((tag) => tag.includes(`aria-label="${label}"`)) ?? ""
  );
}

describe("data pagination boundaries", () => {
  test("middle pages render their actual input value on the first SSR render", () => {
    const html = renderToString(<Pagination page={5} totalCount={100} />);
    expect(html).toContain("Showing 41–50 of 100");
    expect(html).toContain('value="5"');
    expect(buttons(html)).toHaveLength(4);
    expect(buttons(html).every((tag) => tag.includes('type="button"'))).toBe(
      true,
    );
    expect(buttons(html).some((tag) => tag.includes('disabled=""'))).toBe(
      false,
    );
  });

  test("first and last pages disable only navigation beyond the boundary", () => {
    const first = renderToString(<Pagination page={1} totalCount={25} />);
    expect(button(first, "First page")).toContain('disabled=""');
    expect(button(first, "Previous page")).toContain('disabled=""');
    expect(button(first, "Next page")).not.toContain('disabled=""');
    const last = renderToString(<Pagination page={3} totalCount={25} />);
    expect(last).toContain("Showing 21–25 of 25");
    expect(button(last, "Previous page")).not.toContain('disabled=""');
    expect(button(last, "Next page")).toContain('disabled=""');
    expect(button(last, "Last page")).toContain('disabled=""');
  });

  test("zero records show 0–0 and cannot navigate even with hasNextPage", () => {
    const html = renderToString(
      <Pagination page={99} totalCount={0} hasNextPage />,
    );
    expect(html).toContain("Showing 0–0 of 0");
    expect(html).toContain('value="1"');
    expect(buttons(html).every((tag) => tag.includes('disabled=""'))).toBe(
      true,
    );
    expect(html.match(/<input\b[^>]*>/)?.[0]).toContain('disabled=""');
  });

  test("range shrink clamps rendered page, summary and input without emitting callbacks during SSR", () => {
    const changes: number[] = [];
    const html = renderToString(
      <Pagination
        page={50}
        perPage={20}
        totalCount={21}
        onPageChange={(page) => changes.push(page)}
      />,
    );
    expect(html).toContain("Showing 21–21 of 21");
    expect(html).toContain('value="2"');
    expect(changes).toEqual([]);
    const lower = renderToString(<Pagination page={-1} totalCount={21} />);
    expect(lower).toContain("Showing 1–10 of 21");
  });

  test("invalid numeric configuration stays finite and usable", () => {
    const html = renderToString(
      <Pagination
        page={Number.NaN}
        perPage={Number.POSITIVE_INFINITY}
        totalCount={Number.NaN}
      />,
    );
    expect(html).toContain("Showing 0–0 of 0");
    expect(html).not.toMatch(/NaN|Infinity/);
    const minimum = renderToString(
      <Pagination page={2.9} perPage={0} totalCount={5.9} />,
    );
    expect(minimum).toContain("Showing 2–2 of 5");
    expect(minimum).toContain('value="2"');
  });

  test("unknown totals always use sequential controls and honor the next-page signal", () => {
    const html = renderToString(<Pagination page={3} hasNextPage />);
    expect(html).toContain("Page 3");
    expect(buttons(html)).toHaveLength(2);
    expect(html).not.toContain("First page");
    expect(html).not.toContain("Last page");
    expect(html).not.toContain("Page number");
    expect(html).not.toContain("<input");
    expect(button(html, "Next page")).not.toContain('disabled=""');
    const end = renderToString(<Pagination page={3} hasNextPage={false} />);
    expect(button(end, "Next page")).toContain('disabled=""');
    const start = renderToString(<Pagination />);
    expect(start).toContain("Page 1");
    expect(buttons(start).every((tag) => tag.includes('disabled=""'))).toBe(
      true,
    );
  });

  test("known totals ignore cursor signals; simple controls omit the selector", () => {
    const html = renderToString(
      <Pagination totalCount={100} hasNextPage={false} controls="simple" />,
    );
    expect(html).toContain("Showing 1–10 of 100");
    expect(buttons(html)).toHaveLength(2);
    expect(button(html, "Next page")).not.toContain('disabled=""');
    expect(html).not.toContain("<input");
  });

  test("custom info gets normalized range data and labels localize navigation", () => {
    let range: PaginationRangeInfo | undefined;
    const html = renderToString(
      <Pagination
        page={2}
        perPage={25}
        totalCount={27}
        dir="rtl"
        labels={{
          navigation: "分页",
          firstPage: "首页",
          previousPage: "上一页",
          nextPage: "下一页",
          lastPage: "末页",
          pageNumber: "页码",
        }}
      >
        <PaginationInfo>
          {(info) => {
            range = info;
            return `第 ${info.page} 页：${info.from}–${info.to}`;
          }}
        </PaginationInfo>
        <PaginationSeparator />
        <PaginationControls />
      </Pagination>,
    );
    expect(range).toEqual({
      page: 2,
      perPage: 25,
      totalCount: 27,
      pageCount: 2,
      from: 26,
      to: 27,
    });
    expect(html).toContain("第 2 页：26–27");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('aria-label="分页"');
    expect(html).toContain('aria-label="页码"');
    expect(button(html, "下一页")).toContain('disabled=""');
  });

  test("page size and all controls inherit root disabled and stay non-submitting", () => {
    const html = renderToString(
      <Pagination totalCount={100} disabled labels={{ pageSize: "每页条数" }}>
        <PaginationInfo />
        <PaginationPageSize
          value={25}
          onValueChange={() => {
            throw new Error("SSR must not change page size");
          }}
          options={[10, 25, 25, 0, -1]}
          label="每页"
        />
        <PaginationControls />
      </Pagination>,
    );
    expect(html).toContain('aria-label="每页条数"');
    expect(buttons(html).every((tag) => tag.includes('disabled=""'))).toBe(
      true,
    );
    expect(buttons(html).every((tag) => tag.includes('type="button"'))).toBe(
      true,
    );
  });

  test("large dropdown requests fall back to the bounded input", () => {
    const small = renderToString(
      <Pagination totalCount={100}>
        <PaginationControls pageSelector="dropdown" />
      </Pagination>,
    );
    expect(small).not.toContain('data-slot="input"');
    expect(small).toContain('role="combobox"');
    const large = renderToString(
      <Pagination totalCount={1000000}>
        <PaginationControls pageSelector="dropdown" />
      </Pagination>,
    );
    expect(large).toMatch(/inputmode="numeric"/i);
    expect(large).not.toContain('role="combobox"');
    expect(large.length).toBeLessThan(30000);
  });
});

describe("existing link pagination compatibility", () => {
  test("links and active-page semantics survive in the original composition", () => {
    const html = renderToString(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/docs?page=1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/docs?page=2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/docs?page=3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(html).toContain('href="/docs?page=2"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-slot="pagination-content"');
    expect(html).not.toContain('data-slot="pagination-info"');
    expect(html).not.toContain('data-slot="pagination-controls"');
  });

  test("disabled links remove the navigable href and leave the tab order", () => {
    const direct = renderToString(
      <PaginationLink href="/danger" disabled tabIndex={0}>
        2
      </PaginationLink>,
    );
    expect(direct).not.toContain("href=");
    expect(direct).toContain('aria-disabled="true"');
    expect(direct).toContain('tabindex="-1"');
    const inherited = renderToString(
      <Pagination disabled>
        <PaginationNext href="/danger" />
      </Pagination>,
    );
    expect(inherited).not.toContain("href=");
    expect(inherited).toContain('aria-disabled="true"');
  });
});
