"use client";

import { useSyncExternalStore } from "react";

let media: MediaQueryList | undefined;
function getMedia() {
  if (typeof window === "undefined" || !window.matchMedia) return undefined;
  media ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return media;
}
function subscribe(listener: () => void) {
  const query = getMedia();
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}
function getSnapshot() {
  return getMedia()?.matches ?? true;
}
function getServerSnapshot() {
  return true;
}

function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export { useReducedMotion };
