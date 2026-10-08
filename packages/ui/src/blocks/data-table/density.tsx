"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "cn";
import { AlignJustify, Check } from "lucide-react";
import { defaultTableLabels, type TableLabels } from "./labels";
import { type ButtonSize, TooltipButton } from "./tooltip-button";

export const TABLE_SIZE_OPTIONS = [
  { value: "default", label: "Comfortable" },
  { value: "middle", label: "Medium" },
  { value: "compact", label: "Compact" },
] as const;
export type DataTableDensityValue =
  (typeof TABLE_SIZE_OPTIONS)[number]["value"];

export interface DataTableDensityProps {
  value: DataTableDensityValue;
  onValueChange: (value: DataTableDensityValue) => void;
  size?: ButtonSize;
  disabled?: boolean;
  labels?: TableLabels;
  className?: string;
  align?: "start" | "center" | "end";
}

/** Controlled row-density picker that does not own toolbar placement. */
export function DataTableDensity({
  value,
  onValueChange,
  size = "icon-sm",
  disabled = false,
  labels = defaultTableLabels,
  className,
  align = "end",
}: DataTableDensityProps) {
  const names = {
    default: labels.sizeComfortable,
    middle: labels.sizeMedium,
    compact: labels.sizeCompact,
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <TooltipButton
            size={size}
            variant="ghost"
            tooltip={labels.density}
            disabled={disabled}
            className={className}
          >
            <AlignJustify />
          </TooltipButton>
        }
      />
      <DropdownMenuContent align={align} sideOffset={4} className="min-w-32">
        <DropdownMenuGroup>
          {TABLE_SIZE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onValueChange(option.value)}
            >
              <Check
                className={cn(
                  value === option.value ? "opacity-100" : "opacity-0",
                )}
              />
              <span>{names[option.value]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
