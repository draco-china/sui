"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { useState } from "react";
import type { ExampleProps } from "../types";

const pageNumbers = [1, 2, 3, 4, 5];
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [page, setPage] = useState(2);
  return (
    <div className="grid w-full gap-4">
      <Pagination
        aria-label={chinese ? "数字链接分页" : "Numbered pagination links"}
      >
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={`?page=${Math.max(1, page - 1)}`}
              disabled={page === 1}
              text={chinese ? "上一页" : "Previous"}
              aria-label={chinese ? "上一页" : "Previous page"}
              onClick={(event) => {
                event.preventDefault();
                setPage(Math.max(1, page - 1));
              }}
            />
          </PaginationItem>
          {pageNumbers.map((number) => (
            <PaginationItem key={number}>
              <PaginationLink
                href={`?page=${number}`}
                isActive={page === number}
                aria-label={chinese ? `第 ${number} 页` : `Page ${number}`}
                onClick={(event) => {
                  event.preventDefault();
                  setPage(number);
                }}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href={`?page=${Math.min(5, page + 1)}`}
              disabled={page === 5}
              text={chinese ? "下一页" : "Next"}
              aria-label={chinese ? "下一页" : "Next page"}
              onClick={(event) => {
                event.preventDefault();
                setPage(Math.min(5, page + 1));
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {chinese ? `当前页：${page}` : `Current page: ${page}`}
      </output>
    </div>
  );
}
