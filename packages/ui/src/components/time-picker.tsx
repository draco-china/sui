"use client";

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { ClockIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type DateTimeLabelOverrides,
  type DateTimeParts,
  dateTimeLayout,
  formatTime,
  type HourCycle,
  localeHourCycle,
  parseTime,
  resolveDateTimeLabels,
} from "../lib/date-time";
import {
  DateTimeField,
  PickerFrame,
  PickerOverlay,
  pickerLayout,
  TimeWheels,
  useControllable,
  WheelsGroup,
} from "../lib/date-time-field";
import type { GlassProps } from "../lib/glass/with-glass";

/** `"HH:mm"`, or `"HH:mm:ss"` with `seconds`. */
export type TimeValue = string;
export type TimeRange = { from?: TimeValue; to?: TimeValue };

interface TimePickerBaseProps extends GlassProps {
  seconds?: boolean;
  /** Minute step of the wheels and arrow keys; typed minutes stay exact. */
  step?: number;
  /** Follows the locale when unset. */
  hourCycle?: HourCycle;
  /** A BCP 47 tag for segment order, AM/PM names and the hour cycle. */
  locale?: string;
  labels?: DateTimeLabelOverrides;
  disabled?: boolean;
  /** Submits the time string through hidden inputs. */
  name?: string;
  /** Lands on the first segment. */
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-invalid"?: boolean;
}

export interface TimePickerSingleProps extends TimePickerBaseProps {
  range?: false;
  value?: TimeValue;
  defaultValue?: TimeValue;
  onValueChange?: (value: TimeValue | undefined) => void;
}

export interface TimePickerRangeProps extends TimePickerBaseProps {
  range: true;
  value?: TimeRange;
  defaultValue?: TimeRange;
  onValueChange?: (value: TimeRange | undefined) => void;
}

export type TimePickerProps = TimePickerSingleProps | TimePickerRangeProps;

const toParts = (value: TimeValue | undefined) => {
  const parts = parseTime(value);
  return parts.hour === undefined ? undefined : parts;
};

/**
 * A typed, segmented time field with wheels in a popover, or in a bottom
 * sheet on phones; `range` picks a start and an end.
 */
function TimePicker(props: TimePickerProps) {
  const { locale, seconds, step, disabled } = props;
  const hourCycle = useMemo(
    () => props.hourCycle ?? localeHourCycle(locale),
    [props.hourCycle, locale],
  );
  const labels = useMemo(
    () => resolveDateTimeLabels(locale, props.labels),
    [locale, props.labels],
  );
  const layout = useMemo(
    () =>
      dateTimeLayout(locale, { date: false, time: true, seconds, hourCycle }),
    [locale, seconds, hourCycle],
  );
  const [value, setValue] = useControllable<TimeValue | TimeRange>(
    props as {
      value?: TimeValue | TimeRange;
      defaultValue?: TimeValue | TimeRange;
      onValueChange?: (value: TimeValue | TimeRange | undefined) => void;
    },
    "value" in props,
  );
  // Clearing remounts the fields, so no half-typed segment outlives it.
  const [clears, setClears] = useState(0);
  const [open, setOpen] = useState(false);
  const panel = pickerLayout(useIsMobile());

  // One shape for both modes: a single time is a range with only a start.
  // Ends keep the order they were set in: an end before the start crosses
  // midnight, as in 22:00 ~ 02:00.
  const range: TimeRange | undefined = props.range
    ? (value as TimeRange | undefined)
    : { from: value as TimeValue | undefined };
  const emit = (next: TimeRange) => {
    if (!props.range) return setValue(next.from);
    setValue(
      next.from || next.to ? { from: next.from, to: next.to } : undefined,
    );
  };
  const setEdge = (edge: "from" | "to", parts: DateTimeParts | undefined) =>
    emit({ ...range, [edge]: parts && formatTime(parts, seconds) });

  const edges = props.range ? (["from", "to"] as const) : (["from"] as const);
  // Only a range wraps its two fields in a named group; a single field is
  // the group itself.
  const rangeGroup = props.range && {
    role: "group",
    "aria-label": props["aria-label"],
    "aria-labelledby": props["aria-labelledby"],
  };
  const edgeLabel = (edge: "from" | "to") =>
    edge === "from" ? labels.start : labels.end;
  const hasValue = Boolean(range?.from || range?.to);
  const fieldProps = { layout, hourCycle, locale, labels, step, disabled };
  const wheelProps = { hourCycle, locale, labels, seconds, step, disabled };

  return (
    <>
      <PickerFrame
        labels={labels}
        disabled={disabled}
        invalid={props["aria-invalid"]}
        glass={props.glass}
        frosted={props.frosted}
        className={props.className}
        onClear={
          hasValue
            ? () => {
                setClears((count) => count + 1);
                emit({});
              }
            : undefined
        }
        overlay={
          <PickerOverlay
            open={open}
            onOpenChange={setOpen}
            icon={<ClockIcon />}
            label={labels.chooseTime}
            doneLabel={labels.done}
            disabled={disabled}
            glass={props.glass}
            frosted={props.frosted}
          >
            <div className={panel.ends}>
              {edges.map((edge) => (
                <WheelsGroup
                  key={edge}
                  caption={props.range ? edgeLabel(edge) : undefined}
                  align={panel.caption}
                >
                  <TimeWheels
                    {...wheelProps}
                    aria-label={
                      props.range
                        ? `${edgeLabel(edge)} ${labels.chooseTime}`
                        : labels.chooseTime
                    }
                    value={toParts(range?.[edge])}
                    onValueChange={(parts) => setEdge(edge, parts)}
                  />
                </WheelsGroup>
              ))}
            </div>
          </PickerOverlay>
        }
      >
        <div className="flex min-w-0 flex-1 items-center" {...rangeGroup}>
          {edges.map((edge, index) => (
            <span key={edge} className="contents">
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground">
                  ~
                </span>
              )}
              <DateTimeField
                key={`${edge}-${clears}`}
                {...fieldProps}
                id={index === 0 ? props.id : undefined}
                className={
                  props.range ? "flex-none px-1 first:ps-3" : undefined
                }
                aria-label={
                  props.range
                    ? [props["aria-label"], edgeLabel(edge)]
                        .filter(Boolean)
                        .join(" ")
                    : props["aria-label"]
                }
                aria-labelledby={
                  props.range ? undefined : props["aria-labelledby"]
                }
                aria-invalid={props["aria-invalid"]}
                value={toParts(range?.[edge])}
                onValueChange={(parts) => setEdge(edge, parts)}
              />
            </span>
          ))}
        </div>
      </PickerFrame>
      {props.name &&
        edges.map((edge) => (
          <input
            key={edge}
            type="hidden"
            name={props.name}
            value={range?.[edge] ?? ""}
          />
        ))}
    </>
  );
}

export {
  type DateTimeLabelOverrides,
  dateTimeLabels,
  dateTimeLabelsZhCN,
  type HourCycle,
} from "../lib/date-time";
export { TimePicker };
