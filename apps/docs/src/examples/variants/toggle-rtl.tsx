"use client";

import { Toggle } from "@workspace/ui/components/toggle";
import { BookmarkIcon } from "lucide-react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      label: "Bookmark",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      label: "إشارة مرجعية",
    },
  },
  he: {
    dir: "rtl",
    values: {
      label: "סימנייה",
    },
  },
};

export function ToggleRtl() {
  const { dir, t } = useTranslation(translations, "ar");

  return (
    <Toggle aria-label="Toggle bookmark" size="sm" variant="outline" dir={dir}>
      <BookmarkIcon className="group-aria-pressed/toggle:fill-current" />
      {t.label}
    </Toggle>
  );
}

export default ToggleRtl;
