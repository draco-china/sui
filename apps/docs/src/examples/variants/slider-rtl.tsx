"use client";

import { Slider } from "@workspace/ui/components/slider";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {},
  },
  ar: {
    dir: "rtl",
    values: {},
  },
  he: {
    dir: "rtl",
    values: {},
  },
};

export function SliderRtl() {
  const { dir } = useTranslation(translations, "ar");

  return (
    <Slider
      defaultValue={[75]}
      max={100}
      step={1}
      className="mx-auto w-full max-w-xs"
      dir={dir}
    />
  );
}

export default SliderRtl;
