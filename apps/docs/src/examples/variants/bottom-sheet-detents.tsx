"use client";

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  type BottomSheetDetents,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import type { ExampleProps } from "../types";

const options: { detents: BottomSheetDetents; rows: number }[] = [
  { detents: "auto", rows: 3 },
  { detents: "always", rows: 3 },
  { detents: false, rows: 24 },
];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const copy = {
    auto: chinese
      ? ["自动", "内容放得下时只有一档，超过 default 档才增加 lg 档。"]
      : [
          "Auto",
          "One size while content fits; lg appears once it outgrows default.",
        ],
    always: chinese
      ? ["始终两档", "即使内容较少，也保留 lg 档。"]
      : ["Always", "Keeps lg even for short content."],
    single: chinese
      ? ["单档", "按内容自适应高度，放不下时占满可用高度并滚动。"]
      : [
          "Single",
          "Sizes to content and scrolls at the full available height.",
        ],
  };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {options.map(({ detents, rows }) => {
        const [label, description] =
          copy[detents === false ? "single" : detents];
        return (
          <BottomSheet key={String(detents)} detents={detents}>
            <BottomSheetTrigger render={<Button variant="outline" />}>
              {label}
            </BottomSheetTrigger>
            <BottomSheetContent>
              <BottomSheetHeader>
                <BottomSheetTitle>{label}</BottomSheetTitle>
                <BottomSheetDescription>{description}</BottomSheetDescription>
              </BottomSheetHeader>
              <BottomSheetBody>
                {Array.from({ length: rows }, (_, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows.
                    key={index}
                    className="h-10 shrink-0 rounded-xl bg-muted"
                  />
                ))}
              </BottomSheetBody>
              <BottomSheetFooter>
                <BottomSheetClose
                  render={<Button variant="secondary" size="lg" />}
                >
                  {chinese ? "关闭" : "Close"}
                </BottomSheetClose>
              </BottomSheetFooter>
            </BottomSheetContent>
          </BottomSheet>
        );
      })}
    </div>
  );
}
