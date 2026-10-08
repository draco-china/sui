"use client";

import {
  Pagination,
  PaginationControls,
  PaginationInfo,
  type PaginationRangeInfo,
} from "@workspace/ui/components/pagination";
import { useState } from "react";
import type { ExampleProps } from "../types";

const batches = [
  ["evt-101", "evt-102", "evt-103"],
  ["evt-201", "evt-202", "evt-203"],
  ["evt-301", "evt-302"],
];
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const labels = chinese
    ? {
        navigation: "分页",
        firstPage: "首页",
        previousPage: "上一页",
        nextPage: "下一页",
        lastPage: "末页",
        pageNumber: "页码",
        pageSize: "每页条数",
        range: ({ page, totalCount, from, to }: PaginationRangeInfo) =>
          totalCount === undefined
            ? `第 ${page} 页`
            : `显示第 ${from}–${to} 条，共 ${totalCount} 条`,
      }
    : undefined;
  const [page, setPage] = useState(1);
  return (
    <div className="grid w-full gap-4">
      <ul
        aria-label={chinese ? "当前批次事件" : "Events in this batch"}
        className="grid gap-2 rounded-xl bg-muted p-3 text-sm"
      >
        {batches[page - 1]?.map((event) => (
          <li key={event}>
            {chinese ? "事件" : "Event"} {event}
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        onPageChange={setPage}
        perPage={3}
        hasNextPage={page < batches.length}
        labels={labels}
      >
        <PaginationInfo>
          {({ page: currentPage }) =>
            chinese ? `第 ${currentPage} 批` : `Batch ${currentPage}`
          }
        </PaginationInfo>
        <PaginationControls />
      </Pagination>
      <p className="text-muted-foreground text-sm">
        {chinese
          ? "此模拟接口只返回下一批是否存在，不提供总数；第 3 批没有下一批"
          : "This simulated response reports only whether another batch exists. Batch 3 has no next page."}
      </p>
    </div>
  );
}
