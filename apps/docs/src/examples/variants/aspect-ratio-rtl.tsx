"use client";

import { AspectRatio } from "@workspace/ui/components/aspect-ratio";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      caption: "Beautiful landscape",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      caption: "منظر طبيعي جميل",
    },
  },
  he: {
    dir: "rtl",
    values: {
      caption: "נוף יפה",
    },
  },
};

export function AspectRatioRtl() {
  const { dir, t } = useTranslation(translations, "ar");

  return (
    <figure className="w-full max-w-sm" dir={dir}>
      <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted">
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Landscape"
          className="rounded-lg object-cover grayscale dark:brightness-20"
        />
      </AspectRatio>
      <figcaption className="mt-2 text-center text-muted-foreground text-sm">
        {t.caption}
      </figcaption>
    </figure>
  );
}

export default AspectRatioRtl;
