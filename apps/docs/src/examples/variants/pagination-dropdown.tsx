"use client";

import {
  Pagination,
  PaginationControls,
  PaginationInfo,
  PaginationPageSize,
  type PaginationRangeInfo,
  PaginationSeparator,
} from "@workspace/ui/components/pagination";
import { useState } from "react";
import type { ExampleProps } from "../types";

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
  const [perPage, setPerPage] = useState(25);
  return (
    <Pagination
      page={page}
      onPageChange={setPage}
      perPage={perPage}
      totalCount={500}
      labels={labels}
    >
      <PaginationInfo />
      <div className="flex flex-wrap items-center gap-3">
        <PaginationControls pageSelector="dropdown" />
        <PaginationSeparator className="h-5" />
        <PaginationPageSize
          value={perPage}
          onValueChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          options={[10, 25, 50]}
          label={chinese ? "每页条数" : "Rows per page"}
        />
      </div>
    </Pagination>
  );
}
