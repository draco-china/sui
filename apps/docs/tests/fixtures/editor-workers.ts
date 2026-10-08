import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { pathToFileURL } from "node:url";
import { createEditorWorkerLifecycle } from "../../../../packages/ui/src/lib/editor/monaco-workers";

const base = new URL(
  "./esm/vs/",
  pathToFileURL(
    Bun.resolveSync(
      "monaco-editor/package.json",
      new URL("../../../../packages/ui/src", import.meta.url).pathname,
    ),
  ),
).pathname;
class Emitter {
  listeners = new Set<(value: unknown) => void>();
  event = (listener: (value: unknown) => void) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };
  fire(value: unknown) {
    for (const listener of this.listeners) listener(value);
  }
  dispose() {
    this.listeners.clear();
  }
}
mock.module(`${base}editor/editor.api.js`, () => ({
  Emitter,
  editor: { getModels: () => [] },
  languages: {
    onLanguage: () => ({ dispose() {} }),
    register: () => ({ dispose() {} }),
  },
}));
let modelCount = 1;
const disposals = new Set<() => void>();
const lifecycle = createEditorWorkerLifecycle({
  modelCount: () => modelCount,
  onModelDispose: (listener) => {
    disposals.add(listener);
    return { dispose: () => disposals.delete(listener) };
  },
});
class Thread {
  alive = true;
  stops = 0;
  terminate() {
    this.alive = false;
    this.stops++;
  }
}
const threads: Thread[] = [];
mock.module(`${base}internal/common/workers.js`, () => ({
  createWebWorker: () => {
    const thread = new Thread();
    threads.push(thread);
    lifecycle.track(thread as unknown as Worker);
    const proxy = {
      thread,
      format() {
        assert(
          thread.alive,
          "language operations cannot use a terminated Worker",
        );
        return "formatted";
      },
    };
    return {
      getProxy: async () => proxy,
      withSyncedResources: async () => proxy,
      dispose: () => thread.terminate(),
    };
  },
}));
const { typescriptDefaults, javascriptDefaults } = await import(
  `${base}languages/features/typescript/register.js`
);
const { WorkerManager } = await import(
  `${base}languages/features/typescript/workerManager.js`
);
const ts = new WorkerManager("typescript", typescriptDefaults);
const js = new WorkerManager("javascript", javascriptDefaults);
let resets = 0;
lifecycle.registerReset("typescript", () => {
  resets++;
  typescriptDefaults.setCompilerOptions(
    typescriptDefaults.getCompilerOptions(),
  );
  javascriptDefaults.setCompilerOptions(
    javascriptDefaults.getCompilerOptions(),
  );
});
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
function disposeModel() {
  for (const listener of disposals) listener();
  modelCount = 0;
}
const one = lifecycle.acquire();
const two = lifecycle.acquire();
const first = await ts.getLanguageServiceWorker();
const firstJs = await js.getLanguageServiceWorker();
assert.equal(
  await ts.getLanguageServiceWorker(),
  first,
  "Monaco really caches its language client",
);
one();
one();
await tick();
assert(
  first.thread.alive && firstJs.thread.alive,
  "one instance releasing cannot terminate another's shared Worker",
);
assert.equal(resets, 0);
two();
await tick();
assert(
  first.thread.alive,
  "release waits for the child editor to dispose its model",
);
assert.equal(disposals.size, 1);
disposeModel();
await tick();
assert.equal(first.thread.alive, false);
assert.equal(firstJs.thread.alive, false);
assert.equal(
  first.thread.stops,
  1,
  "native termination stays idempotent when both Monaco and the pool dispose",
);
assert.equal(
  disposals.size,
  0,
  "the final release disconnects its model observer",
);

const reopen = lifecycle.acquire();
const next = await ts.getLanguageServiceWorker();
assert.notEqual(
  next,
  first,
  "public defaults changes clear the actual cached WorkerManager client",
);
assert.equal(next.format(), "formatted");
reopen();
const rapidReopen = lifecycle.acquire();
await tick();
assert(next.thread.alive, "a new lease cancels queued idle disposal");
assert.equal(await ts.getLanguageServiceWorker(), next);
rapidReopen();
await tick();
assert.equal(next.thread.alive, false);

const shared = lifecycle.acquire();
modelCount = 1;
const foreignDependent = await ts.getLanguageServiceWorker();
shared();
await tick();
assert(
  foreignDependent.thread.alive,
  "remaining models from another consumer keep shared services usable",
);
disposeModel();
await tick();
assert.equal(foreignDependent.thread.alive, false);

const late = await ts.getLanguageServiceWorker();
await tick();
assert.equal(
  late.thread.alive,
  false,
  "a late task creating a Worker without owners or models is cleaned up",
);
const afterLate = lifecycle.acquire();
const fresh = await ts.getLanguageServiceWorker();
assert.notEqual(fresh, late);
assert.equal(fresh.format(), "formatted");
afterLate();
await tick();
Object.defineProperty(globalThis, "window", {
  value: { setInterval: () => 0 },
});
const { jsonDefaults } = await import(
  `${base}languages/features/json/register.js`
);
const { WorkerManager: JsonManager } = await import(
  `${base}languages/features/json/workerManager.js`
);
const css = await import(`${base}languages/features/css/register.js`);
const { WorkerManager: CssManager } = await import(
  `${base}languages/features/css/workerManager.js`
);
const html = await import(`${base}languages/features/html/register.js`);
const { WorkerManager: HtmlManager } = await import(
  `${base}languages/features/html/workerManager.js`
);
const cssDefaults = [css.cssDefaults, css.scssDefaults, css.lessDefaults];
const htmlDefaults = [
  html.htmlDefaults,
  html.handlebarDefaults,
  html.razorDefaults,
];
lifecycle.registerReset("json", () =>
  jsonDefaults.setDiagnosticsOptions(jsonDefaults.diagnosticsOptions),
);
lifecycle.registerReset("css", () => {
  for (const defaults of cssDefaults) defaults.setOptions(defaults.options);
});
lifecycle.registerReset("html", () => {
  for (const defaults of htmlDefaults) defaults.setOptions(defaults.options);
});
const languageManagers = [
  new JsonManager(jsonDefaults),
  ...cssDefaults.map((defaults) => new CssManager(defaults)),
  ...htmlDefaults.map((defaults) => new HtmlManager(defaults)),
];
const languageOwner = lifecycle.acquire();
const languageClients = await Promise.all(
  languageManagers.map((manager) => manager.getLanguageServiceWorker()),
);
assert(languageClients.every((client) => client.thread.alive));
languageOwner();
await tick();
assert(languageClients.every((client) => !client.thread.alive));
const languageReopen = lifecycle.acquire();
for (const [index, manager] of languageManagers.entries()) {
  const client = await manager.getLanguageServiceWorker();
  assert.notEqual(client, languageClients[index]);
  assert.equal(client.format(), "formatted");
}
languageReopen();
await tick();
for (const manager of languageManagers) manager.dispose();
ts.dispose();
js.dispose();
assert(threads.every((thread) => !thread.alive && thread.stops === 1));
assert.equal(disposals.size, 0);
console.log(
  "actual Monaco TS/JS/JSON/CSS/HTML cache reset, shared leases, deferred model cleanup, reopen, late tasks, and Worker termination passed",
);
