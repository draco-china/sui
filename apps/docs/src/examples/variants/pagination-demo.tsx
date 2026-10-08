"use client";

import {
  Pagination,
  type PaginationRangeInfo,
} from "@workspace/ui/components/pagination";
import { useState } from "react";
import type { ExampleProps } from "../types";

const records = Array.from({ length: 100 }, (_, index) => ({
  id: `request-${index + 1}`,
  number: index + 1,
}));
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
        aria-label={chinese ? "当前页请求" : "Requests on this page"}
        className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-sm sm:grid-cols-5"
      >
        {records.slice((page - 1) * 10, page * 10).map((record) => (
          <li key={record.id}>
            {chinese ? "请求" : "Request"} {record.number}
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        onPageChange={setPage}
        perPage={10}
        totalCount={records.length}
        labels={labels}
      />
    </div>
  );
}
