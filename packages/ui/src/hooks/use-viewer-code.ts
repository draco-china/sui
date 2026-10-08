import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ThemedToken } from "../lib/viewer/shiki";

import { useShikiThemes } from "../lib/viewer/shiki-context";

const EMPTY_LINES: ThemedToken[][] = [];

type HighlightResult = Readonly<{
  key: string;
  lines: ThemedToken[][];
  failed: boolean;
}>;

export function useHighlightedLines(
  code: string,
  lang: string,
  theme: "light" | "dark",
) {
  const themes = useShikiThemes();
  const key = `${lang}\u0000${theme}\u0000${themes.light}\u0000${themes.dark}\u0000${code}`;
  const [result, setResult] = useState<HighlightResult | null>(null);

  useEffect(() => {
    if (!code) return;
    let active = true;
    import("../lib/viewer/shiki")
      .then(({ codeToViewerTokens }) =>
        codeToViewerTokens(code, lang, theme, themes),
      )
      .then((lines) => {
        if (active) setResult({ key, lines, failed: false });
      })
      .catch(() => {
        if (active) setResult({ key, lines: [], failed: true });
      });
    return () => {
      active = false;
    };
  }, [code, key, lang, theme, themes]);

  const current = result?.key === key ? result : null;
  return {
    lines: current?.lines ?? EMPTY_LINES,
    failed: current?.failed ?? false,
    loading: Boolean(code) && !current,
  };
}

export function useStreamingScroll(
  viewportRef: RefObject<HTMLDivElement | null>,
  content: string,
  streaming: boolean,
) {
  const followRef = useRef(true);
  const lastScrollTop = useRef(0);
  const wasStreaming = useRef(streaming);
  const updateFollow = useCallback((viewport: HTMLDivElement) => {
    const top = viewport.scrollTop;
    // Scroll notifications may arrive after new content changes the bottom.
    // An unchanged position is not a reader choosing to scroll away.
    if (top === lastScrollTop.current) return;
    lastScrollTop.current = top;
    followRef.current =
      viewport.scrollHeight - viewport.clientHeight - top <= 32;
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (streaming) followRef.current = true;
    lastScrollTop.current = viewport.scrollTop;
    const onScroll = () => updateFollow(viewport);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [streaming, viewportRef, updateFollow]);
  useEffect(() => {
    const viewport = viewportRef.current;
    const completing = wasStreaming.current && !streaming;
    wasStreaming.current = streaming;
    if (
      (!streaming && !completing) ||
      !content ||
      !viewport ||
      !followRef.current
    )
      return;
    const frame = requestAnimationFrame(() => {
      updateFollow(viewport);
      if (!followRef.current || viewport.scrollHeight <= viewport.clientHeight)
        return;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "instant",
      });
      lastScrollTop.current = viewport.scrollTop;
    });
    return () => cancelAnimationFrame(frame);
  }, [content, streaming, viewportRef, updateFollow]);
}
