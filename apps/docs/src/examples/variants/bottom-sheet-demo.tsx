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
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import type { ExampleProps } from "../types";

const languages = [
  ["English", "English"],
  ["简体中文", "Chinese, Simplified"],
  ["繁體中文", "Chinese, Traditional"],
  ["日本語", "Japanese"],
  ["한국어", "Korean"],
  ["Español", "Spanish"],
  ["Français", "French"],
  ["Deutsch", "German"],
  ["Italiano", "Italian"],
  ["Português", "Portuguese"],
  ["Русский", "Russian"],
  ["Türkçe", "Turkish"],
  ["Tiếng Việt", "Vietnamese"],
  ["Bahasa Indonesia", "Indonesian"],
] as const;

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [language, setLanguage] = useState("English");
  // Choices apply on Done; Cancel leaves the current language unchanged.
  const [draft, setDraft] = useState(language);
  return (
    <BottomSheet
      onOpenChange={(open) => {
        if (open) setDraft(language);
      }}
    >
      <BottomSheetTrigger render={<Button variant="outline" />}>
        {chinese ? `语言：${language}` : `Language: ${language}`}
      </BottomSheetTrigger>
      <BottomSheetContent>
        <BottomSheetHeader className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <BottomSheetClose
            render={
              <Button
                variant="ghost"
                size="sm"
                className="justify-self-start"
              />
            }
          >
            {chinese ? "取消" : "Cancel"}
          </BottomSheetClose>
          <BottomSheetTitle>{chinese ? "语言" : "Language"}</BottomSheetTitle>
          <BottomSheetClose
            render={<Button size="sm" className="justify-self-end" />}
            onClick={() => setLanguage(draft)}
          >
            {chinese ? "完成" : "Done"}
          </BottomSheetClose>
        </BottomSheetHeader>
        <BottomSheetBody className="gap-1 px-3">
          {languages.map(([name, english]) => (
            <button
              key={name}
              type="button"
              aria-pressed={draft === name}
              onClick={() => setDraft(name)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors hover:bg-muted aria-pressed:bg-muted"
            >
              <span className="grid flex-1">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground text-xs">{english}</span>
              </span>
              {draft === name && <CheckIcon className="size-4" />}
            </button>
          ))}
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
