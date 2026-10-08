import { TabBar, type TabBarProps } from "@workspace/ui/components/tab-bar";
import { gsap } from "gsap";
import { MousePointer2 } from "lucide-react";
import { useEffect, useRef } from "react";

export function HomeTabBarPreview(props: Omit<TabBarProps, "ref">) {
  const root = useRef<HTMLElement>(null);
  const cursor = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof PointerEvent === "undefined") return;
    const track = element.querySelector<HTMLElement>(
      '[data-slot="tab-bar-list"]',
    );
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rect = element.getBoundingClientRect();
    let visible = rect.bottom > 0 && rect.top < window.innerHeight;
    let focused = element.contains(document.activeElement);
    let interacting = false;
    let active = false;
    let timer: number | undefined;
    let animation: gsap.core.Timeline | undefined;
    const position = { x: 0, y: 0 };
    const dispatch = (target: HTMLElement, type: string) => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: -1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
          clientX: position.x,
          clientY: position.y,
        }),
      );
    };
    const stop = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      animation?.kill();
      animation = undefined;
      if (cursor.current) gsap.set(cursor.current, { opacity: 0 });
      if (active) {
        active = false;
        dispatch(track, "pointercancel");
      }
      element.dataset.homeTabBarDemo = "paused";
    };
    const canPlay = () =>
      visible &&
      !document.hidden &&
      !reduced.matches &&
      !document.querySelector('[role="menu"], [role="dialog"]') &&
      !focused &&
      !interacting;
    const schedule = (delay = 1800) => {
      if (!canPlay() || timer !== undefined || active) return;
      element.dataset.homeTabBarDemo = "idle";
      timer = window.setTimeout(play, delay);
    };
    function play() {
      timer = undefined;
      if (!canPlay() || !track || !element) return;
      const buttons = [
        ...track.querySelectorAll<HTMLButtonElement>(
          "button[data-tab-bar-item]",
        ),
      ].filter((button) => !button.disabled);
      if (buttons.length < 2) return;
      const current = Math.max(
        0,
        buttons.findIndex(
          (button) => button.getAttribute("aria-current") === "page",
        ),
      );
      const source = buttons[current];
      const destination =
        buttons[current === buttons.length - 1 ? 0 : buttons.length - 1];
      if (!source || !destination) return;
      const from = source.getBoundingClientRect();
      const to = destination.getBoundingClientRect();
      position.x = from.left + from.width / 2;
      position.y = from.top + from.height / 2;
      active = true;
      const origin = element.getBoundingClientRect();
      const updateCursor = () => {
        if (cursor.current)
          gsap.set(cursor.current, {
            x: position.x - origin.left,
            y: position.y - origin.top + 10,
            opacity: 1,
          });
      };
      updateCursor();
      element.dataset.homeTabBarDemo = "holding";
      dispatch(source, "pointerdown");
      animation = gsap
        .timeline({
          onComplete: () => {
            animation = undefined;
            active = false;
            if (cursor.current) gsap.set(cursor.current, { opacity: 0 });
            dispatch(track, "pointerup");
            schedule();
          },
        })
        .to(
          position,
          {
            x: to.left + to.width / 2,
            y: to.top + to.height / 2,
            duration: 2.8,
            ease: "sine.inOut",
            onStart: () => {
              element.dataset.homeTabBarDemo = "sliding";
            },
            onUpdate: () => {
              updateCursor();
              // Deliver after GSAP renders the lens tween for this frame.
              queueMicrotask(() => {
                if (active) dispatch(track, "pointermove");
              });
            },
          },
          0.7,
        );
    }
    const reconcile = () => {
      if (canPlay()) schedule();
      else stop();
    };
    const focusIn = () => {
      focused = true;
      stop();
    };
    const focusOut = (event: FocusEvent) => {
      focused =
        event.relatedTarget instanceof Node &&
        element.contains(event.relatedTarget);
      reconcile();
    };
    const down = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      interacting = true;
      stop();
    };
    const up = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      interacting = false;
      timer = window.setTimeout(() => {
        timer = undefined;
        reconcile();
      }, 300);
    };
    const geometryChanged = () => {
      stop();
      reconcile();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(
          entry?.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        reconcile();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    element.addEventListener("focusin", focusIn);
    element.addEventListener("focusout", focusOut);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("resize", geometryChanged);
    window.addEventListener("scroll", geometryChanged, {
      passive: true,
      capture: true,
    });
    document.addEventListener("visibilitychange", reconcile);
    reduced.addEventListener("change", reconcile);
    schedule(1000);
    return () => {
      stop();
      observer.disconnect();
      element.removeEventListener("focusin", focusIn);
      element.removeEventListener("focusout", focusOut);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("resize", geometryChanged);
      window.removeEventListener("scroll", geometryChanged, true);
      document.removeEventListener("visibilitychange", reconcile);
      reduced.removeEventListener("change", reconcile);
      delete element.dataset.homeTabBarDemo;
    };
  }, []);
  return (
    <div className="relative mx-auto w-fit max-w-full">
      <TabBar ref={root} {...props} />
      <MousePointer2
        ref={cursor}
        aria-hidden="true"
        data-home-demo-cursor=""
        className="pointer-events-none absolute top-0 left-0 z-20 size-5 fill-foreground stroke-background opacity-0 drop-shadow-md"
      />
    </div>
  );
}
