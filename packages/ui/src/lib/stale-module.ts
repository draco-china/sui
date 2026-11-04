/**
 * A lazily loaded module that could not be fetched because the files changed
 * under the open page: a new release replaced them, or the dev server
 * re-bundled its dependencies.
 */
export function isStaleModuleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

const reloadedAt = "sui:stale-module-reload";

/**
 * Reloads the page once to pick up the current files. Returns `false`, and
 * leaves the error showing, when it already reloaded in the last minute.
 */
export function reloadForStaleModule() {
  try {
    const last = Number(sessionStorage.getItem(reloadedAt) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(reloadedAt, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
