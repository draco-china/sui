"use client";

import { useCallback, useEffect, useState } from "react";

let nextEditorModelId = 0;

export function useEditorValue({
  value,
  defaultValue = "",
  onChange,
  disabled,
}: Readonly<{
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}>) {
  const [localValue, setLocalValue] = useState(value ?? defaultValue);

  useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (nextValue: string) => {
      if (disabled) return;
      if (value === undefined) setLocalValue(nextValue);
      onChange?.(nextValue);
    },
    [disabled, onChange, value],
  );

  return { resolvedValue: value ?? localValue, handleChange };
}

export function useEditorModelPath(language: string) {
  // Monaco keeps models process-wide by URI, including across separate React roots.
  // The path is only rendered after mount, so a client-local ID is sufficient.
  const [instanceId] = useState(() => ++nextEditorModelId);
  let extension = language;
  if (language === "typescript") extension = "ts";
  else if (language === "javascript") extension = "jsx";
  return `file:///editor-${instanceId}/index.${extension}`;
}
