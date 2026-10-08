"use client";

import { OTPField } from "@base-ui/react/otp-field";
import { cn } from "cn";
import { MinusIcon } from "lucide-react";
import * as React from "react";
import { withGlass } from "../lib/glass/context";
import { type IconNode, MorphIcon } from "./morph-icon";

type InputOTPStatus = "idle" | "loading" | "success" | "error";
type InputOTPProps = Omit<
  React.ComponentProps<typeof OTPField.Root>,
  "length"
> & {
  length?: number;
  status?: InputOTPStatus;
  feedbackDuration?: number;
  onStatusChange?: (status: InputOTPStatus) => void;
};
const loaderShape: IconNode = [["path", { d: "M12 2a10 10 0 1 0 10 10" }]];
const successShape: IconNode = [["path", { d: "m20 6-11 11-5-5" }]];
const errorShape: IconNode = [["path", { d: "M18 6 6 18M6 6l12 12" }]];
const particles = Array.from({ length: 28 }, (_, index) => ({
  index,
  x: Math.cos((index / 28) * Math.PI * 2) * (72 + (index % 3) * 22),
  y: Math.sin((index / 28) * Math.PI * 2) * (72 + (index % 3) * 22) + 12,
  rotation: (index / 28) * 360 + 90,
}));
const useLayout =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

function InputOTPImplementation({
  className,
  style,
  ref,
  length = 6,
  children,
  status = "idle",
  feedbackDuration = 1250,
  onStatusChange,
  readOnly,
  ...props
}: InputOTPProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const markerRef = React.useRef<HTMLSpanElement>(null);
  const focusOwned = React.useRef(false);
  const mounted = React.useRef(false);
  const completedCallback = React.useRef(-1);
  const onStatusChangeRef = React.useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const [feedback, setFeedback] = React.useState({
    status,
    phase: "feedback" as "feedback" | "restoring" | "done",
    cycle: 0,
  });
  if (feedback.status !== status)
    setFeedback({ status, phase: "feedback", cycle: feedback.cycle + 1 });
  const finished = feedback.status === status && feedback.phase === "done";
  const restoring = status === "error" && feedback.phase === "restoring";
  const busy =
    status === "loading" ||
    status === "success" ||
    (status === "error" && !finished);
  const duration = Number.isFinite(feedbackDuration)
    ? Math.max(0, feedbackDuration)
    : 1250;

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const finishFeedback = React.useCallback(
    (cycle: number, stage: "feedback" | "restoring" = "feedback") => {
      if (!mounted.current) return;
      const marker = markerRef.current;
      const animation = marker
        ? getComputedStyle(marker).animationName
        : "none";
      const animated =
        duration > 0 &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        !!animation &&
        animation !== "none";
      setFeedback((current) => {
        if (
          current.cycle !== cycle ||
          current.phase !== stage ||
          (current.status !== "success" && current.status !== "error")
        )
          return current;
        const phase =
          current.status === "error" && stage === "feedback" && animated
            ? "restoring"
            : "done";
        return { ...current, phase };
      });
    },
    [duration],
  );
  useLayout(() => {
    const root = rootRef.current;
    if (!root || !busy) {
      if (!busy && !finished) focusOwned.current = false;
      return;
    }
    if (root.contains(root.ownerDocument.activeElement))
      focusOwned.current = true;
    function measure() {
      if (!root) return;
      const inputs = root.querySelectorAll<HTMLInputElement>(
        'input[data-slot="input-otp-slot"]',
      );
      inputs.forEach((input, index) => {
        let left = 0;
        let top = 0;
        let node: HTMLElement | null = input;
        while (node && node !== root) {
          left += node.offsetLeft;
          top += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        input.style.setProperty(
          "--otp-collapse-x",
          `${root.clientWidth / 2 - left - input.offsetWidth / 2}px`,
        );
        input.style.setProperty(
          "--otp-collapse-y",
          `${root.clientHeight / 2 - top - input.offsetHeight / 2}px`,
        );
        input.style.setProperty(
          "--otp-collapse-delay",
          `${Math.min(index, inputs.length - index - 1) * 25}ms`,
        );
      });
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [busy, finished]);
  React.useEffect(() => {
    if ((status !== "success" && status !== "error") || finished || restoring)
      return;
    const cycle = feedback.cycle;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const complete = () => finishFeedback(cycle);
    const marker = markerRef.current;
    const animation = marker ? getComputedStyle(marker).animationName : "none";
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (duration === 0) queueMicrotask(complete);
    else
      timer = setTimeout(
        complete,
        duration +
          (media.matches || animation === "none" || !animation ? 0 : 80),
      );
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status, finished, restoring, feedback.cycle, duration, finishFeedback]);
  React.useEffect(() => {
    if (!restoring) return;
    const cycle = feedback.cycle;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const marker = markerRef.current;
    const animation = marker ? getComputedStyle(marker).animationName : "none";
    const complete = () => finishFeedback(cycle, "restoring");
    const motionChange = () => {
      if (media.matches) complete();
    };
    media.addEventListener("change", motionChange);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (media.matches || animation === "none" || !animation)
      queueMicrotask(complete);
    else timer = setTimeout(complete, 460);
    return () => {
      if (timer) clearTimeout(timer);
      media.removeEventListener("change", motionChange);
    };
  }, [restoring, feedback.cycle, finishFeedback]);
  React.useEffect(() => {
    if (
      !finished ||
      (status !== "success" && status !== "error") ||
      completedCallback.current === feedback.cycle
    )
      return;
    completedCallback.current = feedback.cycle;
    const root = rootRef.current;
    const active = root?.ownerDocument.activeElement;
    if (
      status === "error" &&
      focusOwned.current &&
      root &&
      (root.contains(active ?? null) || active === root.ownerDocument.body)
    ) {
      root
        .querySelector<HTMLInputElement>('input[data-slot="input-otp-slot"]')
        ?.focus();
    }
    focusOwned.current = false;
    if (status === "error") onStatusChangeRef.current?.("idle");
  }, [finished, status, feedback.cycle]);
  const activeFeedback = restoring ? "restoring" : "active";
  return (
    <OTPField.Root
      {...props}
      length={length}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      data-slot="input-otp"
      data-status={status}
      data-feedback={busy ? activeFeedback : "restored"}
      aria-busy={status === "loading" || undefined}
      readOnly={readOnly || busy}
      className={(state) =>
        cn(
          "relative flex w-fit items-center gap-2 has-disabled:opacity-50",
          typeof className === "function" ? className(state) : className,
        )
      }
      style={(state) =>
        ({
          ...(typeof style === "function" ? style(state) : style),
          "--otp-feedback-duration": `${duration}ms`,
        }) as React.CSSProperties
      }
    >
      {children}
      {busy && (
        <div
          data-slot="input-otp-state"
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-background",
            status === "error" ? "text-destructive" : "text-primary",
          )}
          aria-hidden="true"
        >
          <span
            data-slot="input-otp-state-icon"
            data-spinning={status === "loading" || undefined}
          >
            <MorphIcon
              icon={
                {
                  idle: loaderShape,
                  loading: loaderShape,
                  success: successShape,
                  error: errorShape,
                }[status]
              }
              size={24}
              strokeWidth={2}
            />
          </span>
          {status === "success" && <span data-slot="input-otp-halo" />}
        </div>
      )}
      {status === "success" && !finished && (
        <div
          data-slot="input-otp-particles"
          className="pointer-events-none absolute top-1/2 left-1/2 size-0"
          aria-hidden="true"
        >
          {particles.map((particle) => (
            <span
              key={particle.index}
              style={
                {
                  "--otp-particle-x": `${particle.x}px`,
                  "--otp-particle-y": `${particle.y}px`,
                  "--otp-particle-rotation": `${particle.rotation}deg`,
                  "--otp-particle-delay": `${100 + particle.index * 4}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      {(status === "success" || status === "error") && !finished && (
        <span
          ref={markerRef}
          key={feedback.cycle}
          data-slot="input-otp-feedback-clock"
          aria-hidden="true"
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.animationName === "input-otp-feedback" &&
              !restoring
            )
              finishFeedback(feedback.cycle);
            if (
              event.target === event.currentTarget &&
              event.animationName === "input-otp-restoration" &&
              restoring
            )
              finishFeedback(feedback.cycle, "restoring");
          }}
        />
      )}
    </OTPField.Root>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}
function InputOTPSlotImplementation({
  className,
  ...props
}: React.ComponentProps<typeof OTPField.Input>) {
  return (
    <OTPField.Input
      {...props}
      data-slot="input-otp-slot"
      className={(state) =>
        cn(
          "relative size-9 rounded-xl border border-transparent bg-input/50 text-center font-medium text-sm tabular-nums caret-transparent outline-none transition-[background-color,box-shadow] selection:bg-transparent selection:text-current focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}
function InputOTPSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<typeof OTPField.Separator>) {
  return (
    <OTPField.Separator
      data-slot="input-otp-separator"
      className={cn(
        "flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? <MinusIcon aria-hidden="true" />}
    </OTPField.Separator>
  );
}
const InputOTP = withGlass(InputOTPImplementation, "scope");
const InputOTPSlot = withGlass(InputOTPSlotImplementation, "control");

export type { InputOTPProps, InputOTPStatus };
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
