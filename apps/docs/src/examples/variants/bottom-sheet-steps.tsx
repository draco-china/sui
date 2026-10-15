"use client";

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import type { ExampleProps } from "../types";

const regions = {
  asia: {
    en: ["Asia", ["Tokyo", "Seoul", "Singapore", "Shanghai", "Bangkok"]],
    zh: ["亚洲", ["东京", "首尔", "新加坡", "上海", "曼谷"]],
  },
  europe: {
    en: ["Europe", ["London", "Paris", "Berlin", "Madrid", "Rome"]],
    zh: ["欧洲", ["伦敦", "巴黎", "柏林", "马德里", "罗马"]],
  },
  americas: {
    en: ["Americas", ["New York", "Toronto", "Mexico City", "São Paulo"]],
    zh: ["美洲", ["纽约", "多伦多", "墨西哥城", "圣保罗"]],
  },
  oceania: {
    en: ["Oceania", ["Sydney", "Melbourne", "Auckland"]],
    zh: ["大洋洲", ["悉尼", "墨尔本", "奥克兰"]],
  },
} as const;

type Region = keyof typeof regions;

export default function Example({ locale }: ExampleProps) {
  const language = locale === "zh-CN" ? "zh" : "en";
  const chinese = language === "zh";
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [regionName, cities] = region ? regions[region][language] : [];
  const row =
    "flex items-center justify-between rounded-2xl px-4 py-3 text-start font-medium transition-colors hover:bg-muted";
  // The first step offers Cancel; later steps go Back instead.
  const leading = region ? (
    <Button
      variant="ghost"
      size="sm"
      className="justify-self-start"
      onClick={() => setRegion(null)}
    >
      <ChevronLeftIcon data-icon="inline-start" />
      {chinese ? "返回" : "Back"}
    </Button>
  ) : (
    <BottomSheetClose
      render={
        <Button variant="ghost" size="sm" className="justify-self-start" />
      }
    >
      {chinese ? "取消" : "Cancel"}
    </BottomSheetClose>
  );
  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(next) => {
        if (!next) setRegion(null);
      }}
      // Each step starts at the default size, at the top of its list.
      contentKey={region ?? "regions"}
    >
      <BottomSheetTrigger render={<Button variant="outline" />}>
        {city ?? (chinese ? "选择城市" : "Choose a city")}
      </BottomSheetTrigger>
      <BottomSheetContent>
        <BottomSheetHeader className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {leading}
          <BottomSheetTitle>
            {regionName ?? (chinese ? "地区" : "Region")}
          </BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody className="gap-1 px-3 pb-6">
          {cities?.map((name) => (
            <button
              key={name}
              type="button"
              className={row}
              onClick={() => {
                setCity(name);
                setOpen(false);
              }}
            >
              {name}
            </button>
          ))}
          {!region &&
            (Object.keys(regions) as Region[]).map((key) => (
              <button
                key={key}
                type="button"
                className={row}
                onClick={() => setRegion(key)}
              >
                {regions[key][language][0]}
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </button>
            ))}
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
