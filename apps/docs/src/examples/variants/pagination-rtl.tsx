"use client";

import { DirectionProvider } from "@workspace/ui/components/direction";
import {
  Pagination,
  type PaginationRangeInfo,
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
  const [page, setPage] = useState(5);
  return (
    <DirectionProvider direction="rtl">
      <div dir="rtl" className="w-full">
        <Pagination
          page={page}
          onPageChange={setPage}
          perPage={10}
          totalCount={100}
          labels={labels}
        />
      </div>
    </DirectionProvider>
  );
}
