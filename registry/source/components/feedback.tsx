"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { type HapticKind, haptic } from "@/lib/haptics";
import {
  createTickPlayer,
  type TickPlayer,
  type TickVariant,
} from "@/lib/tick-sound";

/**
 * Per-component feedback switch. `true` plays haptics and sound, `"haptic"` or
 * `"sound"` plays only that one, `false` stays silent, and leaving it unset
 * follows the nearest `FeedbackProvider`.
 */
export type FeedbackOption = boolean | "haptic" | "sound";

interface FeedbackSettings {
  haptics: boolean;
  sound: boolean;
}

// Silent unless asked: a FeedbackProvider or a `feedback` prop turns it on,
// so components never gain side effects their primitives do not have.
const FeedbackContext = createContext<FeedbackSettings>({
  haptics: false,
  sound: false,
});

function FeedbackProvider({
  haptics = false,
  sound = false,
  children,
}: Partial<FeedbackSettings> & { children?: ReactNode }) {
  return (
    <FeedbackContext value={{ haptics, sound }}>{children}</FeedbackContext>
  );
}

const SILENT: FeedbackSettings = { haptics: false, sound: false };

function resolveFeedback(
  option: FeedbackOption | undefined,
  defaults: FeedbackSettings,
): FeedbackSettings {
  if (option === undefined) return defaults;
  if (option === true) return { haptics: true, sound: true };
  if (option === "haptic") return { haptics: true, sound: false };
  if (option === "sound") return { haptics: false, sound: true };
  return SILENT;
}

/**
 * Resolves whether haptics and sound are on, for components such as WheelPicker
 * that voice themselves but still follow the shared `feedback` switch.
 */
function useFeedbackSettings(option?: FeedbackOption, { optIn = false } = {}) {
  const context = use(FeedbackContext);
  return resolveFeedback(option, optIn ? SILENT : context);
}

/**
 * Returns a stable `trigger(kind, sound)` for a component's feedback moments;
 * `sound: false` keeps it to haptics for components that voice themselves.
 * Pass `optIn` for controls such as Button that should stay silent unless the
 * caller sets `feedback` explicitly.
 */
function useFeedback(option?: FeedbackOption, { optIn = false } = {}) {
  const settings = useFeedbackSettings(option, { optIn });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Players are created on the first sound so silent controls never touch
  // Web Audio, and each one releases its share of the page context on unmount.
  const players = useRef(new Map<TickVariant, TickPlayer>());
  useEffect(() => {
    const current = players.current;
    return () => {
      for (const player of current.values()) player.dispose();
      current.clear();
    };
  }, []);

  return useCallback((kind: HapticKind, sound: TickVariant | false = "tap") => {
    const { haptics, sound: soundOn } = settingsRef.current;
    if (haptics) haptic(kind);
    if (!soundOn || !sound) return;
    let player = players.current.get(sound);
    if (!player) {
      player = createTickPlayer(sound);
      players.current.set(sound, player);
    }
    player.play();
  }, []);
}

export { FeedbackProvider, useFeedback, useFeedbackSettings };
