import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const metricsPath = fileURLToPath(new URL("./metrics.ts", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: { host: "127.0.0.1", port: 3011, strictPort: true },
  plugins: [
    {
      name: "measure-real-glass-capture",
      transform(source, id) {
        if (id.endsWith("/lib/glass/runtime.ts")) {
          return (
            `import { debugInvalidation, debugMutationRecords, diagnosticsEnabled, debugSnapshot } from ${JSON.stringify(metricsPath)};\n` +
            source
              .replace(
                "function invalidateScene() {",
                "function invalidateScene() { debugInvalidation();",
              )
              .replace(
                "if (!geometryOnly) {",
                "if (!geometryOnly) { debugMutationRecords(relevant);",
              )
              .replace(
                "let cached = sharedSnapshots.get(captureTarget);",
                `let cached = sharedSnapshots.get(captureTarget);
if (diagnosticsEnabled) debugSnapshot({
  kind: "snapshot-lookup", slot: element.dataset.slot,
  key, exclusions, dependencies,
  cachedKeys: cached ? [...cached.frames.keys()] : [],
  cachedRevision: cached?.revision, sceneRevision, capturedRevision,
  hit: cached?.revision === sceneRevision && cached.frames.has(key),
  peers: peers.map(peer => ({ id: idFor(peer), slot: peer.dataset.slot, version: backgroundVersions.get(peer) ?? 0 })),
  frozen: element.dataset.glassFrozen,
  rect: [rect.x, rect.y, rect.width, rect.height],
});`,
              )
              .replace(
                "if (!current(element, state) || dependencies !== dependencyKey())",
                `if (diagnosticsEnabled) {
  const latest = element.getBoundingClientRect();
  debugSnapshot({
    kind: "capture-return", slot: element.dataset.slot, key,
    current: current(element, state),
    dependencies, latestDependencies: dependencyKey(),
    capturedRevision, sceneRevision,
    initialRect: [rect.x, rect.y, rect.width, rect.height],
    latestRect: [latest.x, latest.y, latest.width, latest.height],
  });
}
if (!current(element, state) || dependencies !== dependencyKey())`,
              )
              .replace(
                "cached.frames.set(key, snapshot);",
                `cached.frames.set(key, snapshot);
if (diagnosticsEnabled) debugSnapshot({
  kind: "snapshot-store", slot: element.dataset.slot,
  key, cachedKeys: [...cached.frames.keys()],
  cachedRevision: cached.revision, sceneRevision,
});`,
              )
          );
        }
        if (!id.endsWith("/lib/glass/capture.ts")) return;
        return (
          source
            .replace(
              "export async function captureGlassBackground(",
              "async function originalCaptureGlassBackground(",
            )
            .replace(
              'throw new Error("Glass background resource embedding failed");',
              `{
  if (diagnosticsEnabled) debugSnapshot({
    kind: "unembedded-resource", resource,
    context: source.slice(Math.max(0, (match.index ?? 0) - 100), (match.index ?? 0) + 200),
  });
  throw new Error("Glass background resource embedding failed");
}`,
            ) +
          `\nimport { measure, debugSnapshot, diagnosticsEnabled } from ${JSON.stringify(metricsPath)};
export function captureGlassBackground(target, blocked) {
  return measure("capture", () => originalCaptureGlassBackground(target, blocked));
}`
        );
      },
    },
    tailwindcss(),
    react(),
  ],
});
