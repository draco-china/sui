import { describe, expect, test } from "bun:test";
import {
  type ClipboardStatus,
  createClipboardController,
} from "../../../packages/ui/src/hooks/use-clipboard";

function deferred() {
  let resolve: () => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("clipboard async feedback", () => {
  test("announces success only after the write and resets after the delay", async () => {
    const write = deferred();
    const states: ClipboardStatus[] = [];
    const copied: string[] = [];
    const controller = createClipboardController({
      writeText: () => write.promise,
      onStatusChange: (state) => states.push(state),
      onCopy: (value) => copied.push(value),
      resetDelay: 5,
    });
    const result = controller.copy("hello");
    expect(states).toEqual(["pending"]);
    expect(copied).toEqual([]);
    write.resolve();
    expect(await result).toBe(true);
    expect(states).toEqual(["pending", "copied"]);
    expect(copied).toEqual(["hello"]);
    await Bun.sleep(15);
    expect(states.at(-1)).toBe("idle");
    controller.dispose();
  });
  test("failed writes report the error and never announce success", async () => {
    const error = new Error("Clipboard permission denied");
    const states: ClipboardStatus[] = [];
    const errors: Error[] = [];
    const copied: string[] = [];
    const controller = createClipboardController({
      writeText: async () => {
        throw error;
      },
      onStatusChange: (state) => states.push(state),
      onCopyError: (reason) => errors.push(reason),
      onCopy: (value) => copied.push(value),
    });
    expect(await controller.copy("hello")).toBe(false);
    expect(states).toEqual(["pending", "error"]);
    expect(errors).toEqual([error]);
    expect(copied).toEqual([]);
    controller.dispose();
  });
  test("pending writes cannot overlap and stale attempts cannot replace new feedback", async () => {
    const first = deferred();
    const second = deferred();
    const writes: string[] = [];
    const states: ClipboardStatus[] = [];
    const copied: string[] = [];
    const controller = createClipboardController({
      writeText: (value) => {
        writes.push(value);
        return value === "first" ? first.promise : second.promise;
      },
      onStatusChange: (state) => states.push(state),
      onCopy: (value) => copied.push(value),
    });
    const old = controller.copy("first");
    expect(await controller.copy("ignored")).toBe(false);
    expect(writes).toEqual(["first"]);
    controller.reset();
    const current = controller.copy("second");
    first.resolve();
    expect(await old).toBe(false);
    expect(copied).toEqual([]);
    expect(states.at(-1)).toBe("pending");
    second.resolve();
    expect(await current).toBe(true);
    expect(copied).toEqual(["second"]);
    expect(states.at(-1)).toBe("copied");
    controller.dispose();
  });
  test("disposal prevents async callbacks and clears feedback timers", async () => {
    const write = deferred();
    const states: ClipboardStatus[] = [];
    const controller = createClipboardController({
      writeText: () => write.promise,
      onStatusChange: (state) => states.push(state),
      resetDelay: 5,
    });
    const pending = controller.copy("hello");
    controller.dispose();
    write.resolve();
    expect(await pending).toBe(false);
    expect(states).toEqual(["pending"]);
    controller.activate();
    expect(await controller.copy("hello")).toBe(true);
    controller.dispose();
    const before = [...states];
    await Bun.sleep(15);
    expect(states).toEqual(before);
  });
});
