import type { RowData } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { X } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { defaultTableLabels, type TableLabels } from "./labels";
import { TooltipButton } from "./tooltip-button";
import type { Table } from "./types";

/** Floating keyboard-accessible actions for selected table rows. */
export function TableBulkActions<TData extends RowData>({
  table,
  children,
  disabled = false,
  labels = defaultTableLabels,
}: Readonly<{
  table: Table<TData>;
  children?: ReactNode;
  disabled?: boolean;
  labels?: TableLabels;
}>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const descriptionId = useId();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (selectedCount === 0) return;

    queueMicrotask(() =>
      setAnnouncement(labels.bulkAnnouncement(selectedCount)),
    );

    const timer = setTimeout(() => setAnnouncement(""), 3000);
    return () => clearTimeout(timer);
  }, [selectedCount, labels]);

  function handleKeyDown(event: KeyboardEvent) {
    const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    );
    if (!buttons?.length) return;
    const isRtl =
      toolbarRef.current &&
      getComputedStyle(toolbarRef.current).direction === "rtl";

    const activeElement = document.activeElement;
    const currentIndex =
      activeElement instanceof HTMLButtonElement
        ? Array.from(buttons).indexOf(activeElement)
        : -1;

    switch (event.key) {
      case "ArrowRight": {
        event.preventDefault();
        const offset = isRtl ? -1 : 1;
        buttons[
          (currentIndex + offset + buttons.length) % buttons.length
        ]?.focus();
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        const offset = isRtl ? 1 : -1;
        buttons[
          (currentIndex + offset + buttons.length) % buttons.length
        ]?.focus();
        break;
      }
      case "Home": {
        event.preventDefault();
        buttons[0]?.focus();
        break;
      }
      case "End": {
        event.preventDefault();
        buttons[buttons.length - 1]?.focus();
        break;
      }
      case "Escape": {
        const target =
          event.target instanceof HTMLElement ? event.target : null;
        const dropdownSelector =
          '[data-slot="dropdown-menu-trigger"], [data-slot="dropdown-menu-content"]';

        if (
          target?.closest(dropdownSelector) ||
          (activeElement instanceof HTMLElement &&
            activeElement.closest(dropdownSelector))
        ) {
          return;
        }

        event.preventDefault();
        table.resetRowSelection();
        break;
      }
    }
  }

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      <div
        ref={toolbarRef}
        inert={disabled}
        aria-busy={disabled}
        role="toolbar"
        aria-label={labels.bulkToolbar(selectedCount)}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div className="flex items-center gap-2 overflow-x-auto rounded-3xl border bg-popover p-2 text-popover-foreground shadow-lg">
          <TooltipButton
            size="icon-sm"
            variant="ghost"
            title={labels.bulkClearSelection}
            tooltip={labels.bulkClearSelection}
            onClick={() => table.resetRowSelection()}
          >
            <X />
          </TooltipButton>

          <Separator
            orientation="vertical"
            className="h-5 data-vertical:self-center"
          />

          <div
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm"
            id={descriptionId}
          >
            <Badge>{selectedCount}</Badge>
            <span className="hidden sm:inline">
              {labels.bulkSelectedRows(selectedCount)}
            </span>
          </div>

          {children != null && (
            <>
              <Separator
                orientation="vertical"
                className="h-5 data-vertical:self-center"
              />
              {children}
            </>
          )}
        </div>
      </div>
    </>
  );
}
