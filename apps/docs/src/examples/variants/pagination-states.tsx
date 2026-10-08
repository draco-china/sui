"use client";

import {
  Pagination,
  PaginationControls,
  PaginationInfo,
  PaginationPageSize,
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
  const [middlePage, setMiddlePage] = useState(5);
  const [largePage, setLargePage] = useState(1);
  const [disabledPage, setDisabledPage] = useState(3);
  const [disabledSize, setDisabledSize] = useState(10);
  return (
    <div className="grid w-full gap-6">
      <div className="grid gap-2">
        <h3 className="font-medium text-sm">
          {chinese ? "中间页" : "Middle page"}
        </h3>
        <Pagination
          page={middlePage}
          onPageChange={setMiddlePage}
          perPage={10}
          totalCount={100}
          labels={labels}
        />
      </div>
      <div className="grid gap-2">
        <h3 className="font-medium text-sm">
          {chinese ? "大数据集" : "Large dataset"}
        </h3>
        <Pagination
          page={largePage}
          onPageChange={setLargePage}
          perPage={25}
          totalCount={1250}
          labels={labels}
        />
      </div>
      <div className="grid gap-2">
        <h3 className="font-medium text-sm">
          {chinese ? "没有结果" : "No results"}
        </h3>
        <Pagination totalCount={0} labels={labels} />
      </div>
      <div className="grid gap-2">
        <h3 className="font-medium text-sm">
          {chinese ? "禁用状态" : "Disabled"}
        </h3>
        <Pagination
          page={disabledPage}
          onPageChange={setDisabledPage}
          perPage={disabledSize}
          totalCount={100}
          disabled
          labels={labels}
        >
          <PaginationInfo />
          <div className="flex flex-wrap items-center gap-3">
            <PaginationPageSize
              value={disabledSize}
              onValueChange={setDisabledSize}
              label={chinese ? "每页条数" : "Rows per page"}
            />
            <PaginationControls />
          </div>
        </Pagination>
      </div>
    </div>
  );
}
