type Disposable = { dispose: () => void };

export function createEditorWorkerLifecycle({
  modelCount,
  onModelDispose,
}: {
  modelCount: () => number;
  onModelDispose: (listener: () => void) => Disposable;
}) {
  const workers = new Set<Worker>();
  const resets = new Map<string, () => void>();
  let owners = 0;
  let queued = false;
  let models: Disposable | undefined;

  function releaseIdle() {
    if (owners || modelCount()) return;
    if (workers.size) {
      // Public defaults notifications clear Monaco's cached language clients
      // before termination, so reopening never reuses a terminated Worker.
      for (const reset of resets.values()) reset();
      for (const worker of [...workers]) worker.terminate();
    }
    models?.dispose();
    models = undefined;
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      releaseIdle();
    });
  }
  function observeModels() {
    models ??= onModelDispose(() => {
      if (!owners) schedule();
    });
  }
  return {
    acquire() {
      owners++;
      observeModels();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        owners--;
        if (!owners) schedule();
      };
    },
    track<T extends Worker>(worker: T): T {
      const terminate = worker.terminate.bind(worker);
      let terminated = false;
      worker.terminate = () => {
        if (terminated) return;
        terminated = true;
        workers.delete(worker);
        terminate();
      };
      workers.add(worker);
      observeModels();
      if (!owners) schedule();
      return worker;
    },
    registerReset(language: string, reset: () => void) {
      resets.set(language, reset);
      if (!owners && workers.size) schedule();
    },
  };
}
