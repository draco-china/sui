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
  const [perPage, setPerPage] = useState(20);
  return (
    <Pagination
      page={page}
      onPageChange={setPage}
      perPage={perPage}
      totalCount={205}
      labels={labels}
    >
      <PaginationInfo>
        {({ page: currentPage, pageCount, perPage: size }) =>
          chinese
            ? `第 ${currentPage} 页／共 ${pageCount} 页，每页 ${size} 条`
            : `Page ${currentPage} of ${pageCount}, ${size} rows per page`
        }
      </PaginationInfo>
      <div className="flex flex-wrap items-center gap-3">
        <PaginationPageSize
          value={perPage}
          onValueChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          options={[10, 20, 50]}
          label={chinese ? "每页条数" : "Rows per page"}
        />
        <PaginationSeparator className="h-5" />
        <PaginationControls />
      </div>
    </Pagination>
  );
}
