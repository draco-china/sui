"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { GlassProps } from "@/lib/glass/with-glass";
import type { ImageLabelOverrides } from "@/components/ui/image/labels";
import { ImagePreview } from "@/components/ui/image/preview";

interface GroupEntry {
  readonly src: string;
  readonly alt: string | undefined;
  readonly element: RefObject<HTMLElement | null>;
}

interface GroupContextValue {
  register(id: string, entry: GroupEntry): () => void;
  show(id: string): void;
}

const ImageGroupContext = createContext<GroupContextValue | null>(null);

export function useImageGroup() {
  return useContext(ImageGroupContext);
}

export interface ImageGroupPreviewConfig {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly index?: number;
  readonly onIndexChange?: (index: number) => void;
  readonly container?: ComponentProps<typeof ImagePreview>["container"];
}

export interface ImageGroupProps extends GlassProps {
  readonly children: ReactNode;
  readonly preview?: ImageGroupPreviewConfig;
  /** Alt text for previewed images without their own. */
  readonly alt?: string;
  readonly labels?: ImageLabelOverrides;
}

/** Document order, so the gallery matches what the reader sees. */
function byPosition(a: GroupEntry, b: GroupEntry) {
  const first = a.element.current;
  const second = b.element.current;
  if (!first || !second) return 0;
  const position = first.compareDocumentPosition(second);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

function sortedEntries(entries: Map<string, GroupEntry>) {
  return [...entries].sort(([, a], [, b]) => byPosition(a, b));
}

/**
 * Previews the Images inside it as one gallery that opens on the clicked
 * image. It renders no wrapper element.
 */
export function ImageGroup({
  children,
  preview = {},
  alt,
  labels,
  glass,
  frosted,
}: Readonly<ImageGroupProps>) {
  const entries = useRef(new Map<string, GroupEntry>());
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const [localOpen, setLocalOpen] = useState(false);
  const [localIndex, setLocalIndex] = useState(0);
  const open = preview.open ?? localOpen;
  const index = preview.index ?? localIndex;
  const { onOpenChange, onIndexChange } = preview;

  const setOpen = useCallback(
    (next: boolean) => {
      setLocalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const setIndex = useCallback(
    (next: number) => {
      setLocalIndex(next);
      onIndexChange?.(next);
    },
    [onIndexChange],
  );

  const context = useMemo<GroupContextValue>(
    () => ({
      register(id, entry) {
        entries.current.set(id, entry);
        refresh();
        return () => {
          entries.current.delete(id);
          refresh();
        };
      },
      show(id) {
        const list = sortedEntries(entries.current);
        setIndex(
          Math.max(
            0,
            list.findIndex(([key]) => key === id),
          ),
        );
        setOpen(true);
      },
    }),
    [setIndex, setOpen],
  );

  const items = sortedEntries(entries.current).map(([, entry]) => ({
    src: entry.src,
    alt: entry.alt,
  }));

  return (
    <ImageGroupContext.Provider value={context}>
      {children}
      {items.length > 0 && (
        <ImagePreview
          images={items}
          open={open}
          onOpenChange={setOpen}
          index={index}
          onIndexChange={setIndex}
          alt={alt}
          labels={labels}
          container={preview.container}
          glass={glass}
          frosted={frosted}
        />
      )}
    </ImageGroupContext.Provider>
  );
}
