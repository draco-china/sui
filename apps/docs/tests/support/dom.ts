import { type DetachedWindowAPI, Window as HappyWindow } from "happy-dom";

export type FixtureWindow = Window &
  typeof globalThis & { happyDOM: DetachedWindowAPI };

/** The DOM classes React, Base UI and Testing Library look up on globals. */
const domClasses = [
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
  "HTMLFormElement",
  "HTMLIFrameElement",
  "Element",
  "Node",
  "Document",
  "DocumentFragment",
  "ShadowRoot",
  "SVGElement",
  "MutationObserver",
  "ResizeObserver",
  "KeyboardEvent",
] as const;

/**
 * Installs a happy-dom window as the page globals. Call it before importing
 * React or a component, since they read the globals when they load. A
 * fixture then replaces what it fakes, such as observers or `matchMedia`.
 */
export function installDom(
  url = "http://localhost",
  size?: { readonly width: number; readonly height: number },
): FixtureWindow {
  const window = new HappyWindow({ url, ...size }) as unknown as FixtureWindow;
  const scope = window as unknown as Record<string, unknown>;
  Object.assign(globalThis, {
    window,
    document: window.document,
    ...Object.fromEntries(domClasses.map((name) => [name, scope[name]])),
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator,
  });
  return window;
}

/**
 * Runs `check` until it stops throwing, letting React, timers and debounces
 * run between tries, so a fixture waits for what it asserts instead of a
 * guessed delay. Throws the last failure after `timeout` ms.
 */
export async function waitFor(check: () => void, timeout = 2000) {
  const { act } = await import("react");
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      check();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
}
