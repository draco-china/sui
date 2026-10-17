"use client";

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetExpandedContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import {
  ClockIcon,
  NavigationIcon,
  PhoneIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const hours = chinese
    ? ["周一至周五 7:00–22:00", "周六 8:00–23:00", "周日 8:00–21:00"]
    : ["Mon–Fri 7:00–22:00", "Sat 8:00–23:00", "Sun 8:00–21:00"];
  const reviews = chinese
    ? ["日落时分景色很美。", "咖啡不错，周末人多。", "适合散步，停车方便。"]
    : [
        "Beautiful at sunset.",
        "Good coffee, busy on weekends.",
        "Easy parking and a nice walk.",
      ];
  return (
    <div className="grid w-full justify-items-center overflow-hidden rounded-2xl bg-[url(/playground/backgrounds/coast-poster.jpg)] bg-center bg-cover px-6 py-16">
      <BottomSheet detents="always">
        <BottomSheetTrigger render={<Button />}>
          {chinese ? "查看地点" : "View place"}
        </BottomSheetTrigger>
        <BottomSheetContent frosted>
          <BottomSheetHeader collapseOnScroll className="pe-14">
            <BottomSheetTitle className="text-xl">
              {chinese ? "海岸瞭望台" : "Coast Lookout"}
            </BottomSheetTitle>
            <BottomSheetDescription>
              {chinese
                ? "观景台 · 步行 12 分钟 · 4.8 分"
                : "Viewpoint · 12 min walk · 4.8 rating"}
            </BottomSheetDescription>
            <BottomSheetClose
              aria-label={chinese ? "关闭" : "Close"}
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute inset-e-4 top-5 rounded-full"
                />
              }
            >
              <XIcon />
            </BottomSheetClose>
          </BottomSheetHeader>
          <BottomSheetBody>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" className="h-14 flex-col gap-1">
                <NavigationIcon />
                {chinese ? "路线" : "Directions"}
              </Button>
              <Button variant="secondary" className="h-14 flex-col gap-1">
                <PhoneIcon />
                {chinese ? "致电" : "Call"}
              </Button>
              <Button variant="secondary" className="h-14 flex-col gap-1">
                <StarIcon />
                {chinese ? "收藏" : "Save"}
              </Button>
            </div>
            <p className="text-muted-foreground">
              {chinese
                ? "向上拖动查看营业时间和评价。展开后玻璃逐渐变为不透明。"
                : "Drag up for hours and reviews. The glass turns opaque as the sheet expands."}
            </p>
            <BottomSheetExpandedContent className="grid gap-4">
              <section className="grid gap-2">
                <h3 className="flex items-center gap-2 font-medium">
                  <ClockIcon className="size-4" />
                  {chinese ? "营业时间" : "Hours"}
                </h3>
                {hours.map((line) => (
                  <p key={line} className="text-muted-foreground">
                    {line}
                  </p>
                ))}
              </section>
              <section className="grid gap-2">
                <h3 className="font-medium">{chinese ? "评价" : "Reviews"}</h3>
                {[...reviews, ...reviews, ...reviews].map((review, index) => (
                  <p
                    // biome-ignore lint/suspicious/noArrayIndexKey: repeated sample copy.
                    key={index}
                    className="rounded-2xl bg-muted/60 px-4 py-3"
                  >
                    {review}
                  </p>
                ))}
              </section>
            </BottomSheetExpandedContent>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}
