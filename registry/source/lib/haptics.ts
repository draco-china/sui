// Fires a short system haptic, modeled on UIKit's feedback generators.
// Android and other browsers with the Vibration API get a timed pattern.
// iOS Safari has no Vibration API, but since iOS 18 toggling an
// `<input type="checkbox" switch>` plays the system Taptic click; clicking a
// hidden label for one is the only way a web page can reach the Taptic Engine.
// Both paths only work inside a user gesture, and everything else is a no-op.

export type HapticKind =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 16,
  heavy: 24,
  success: [10, 70, 14],
  warning: [16, 90, 16],
  error: [14, 50, 14, 50, 20],
};

// The iOS switch click has a single strength, so notification kinds are told
// apart by how many clicks they play.
const PULSES: Record<HapticKind, number> = {
  selection: 1,
  light: 1,
  medium: 1,
  heavy: 1,
  success: 2,
  warning: 2,
  error: 3,
};

const PULSE_GAP = 70; // milliseconds between iOS clicks

let label: HTMLLabelElement | null = null;

function getSwitchLabel(): HTMLLabelElement {
  if (label?.isConnected) return label;
  label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.cssText =
    "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip-path:inset(50%)";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.tabIndex = -1;
  input.setAttribute("switch", "");
  label.append(input);
  document.body.append(label);
  return label;
}

function canVibrate(): boolean {
  return typeof navigator.vibrate === "function";
}

// Only touch devices without the Vibration API take the switch path, so
// desktop browsers never pay for the hidden element.
function canTapticSwitch(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function haptic(kind: HapticKind = "selection") {
  if (typeof window === "undefined") return;
  try {
    if (canVibrate()) {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
    if (!canTapticSwitch()) return;
    const target = getSwitchLabel();
    target.click();
    for (let i = 1; i < PULSES[kind]; i++) {
      window.setTimeout(() => target.click(), PULSE_GAP * i);
    }
  } catch {
    // Haptics are decoration; a blocked API must never break the interaction.
  }
}
