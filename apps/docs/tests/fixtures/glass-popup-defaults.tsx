import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import type { GlassConfiguration } from "../../../../packages/ui/src/lib/glass/context";

const window = new Window({ url: "http://localhost" });
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  MutationObserver: window.MutationObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const configurations = new Map<string, GlassConfiguration>();
mock.module("../../../../packages/ui/src/lib/glass/runtime", () => ({
  acquireGlass: (configuration: GlassConfiguration) => {
    configurations.set(configuration.id, configuration);
    return () => configurations.delete(configuration.id);
  },
  updateGlassConfiguration: (configuration: GlassConfiguration) =>
    configurations.set(configuration.id, configuration),
  refreshGlass: () => {},
}));
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { GlassContext, withGlass } = await import(
  "../../../../packages/ui/src/lib/glass/context"
);
const Layer = withGlass(
  (props: { id: string }) => <div {...props} />,
  "portal",
);
const Panel = withGlass((props: { id: string }) => <div {...props} />);
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const configuration = (id: string) => {
  const scope = document.getElementById(id)?.getAttribute("data-glass-scope");
  return scope ? configurations.get(scope) : undefined;
};
await act(async () =>
  root.render(
    <GlassContext.Provider
      value={{
        enabled: true,
        surface: false,
        configuration: { material: "clear", edge: "diagonal" },
      }}
    >
      <Panel id="panel" />
      <Layer id="popup" />
      <Layer
        id="custom"
        glassConfig={{ material: "clear", edge: "diagonal" }}
      />
      <Layer id="ordinary" glass={false} />
    </GlassContext.Provider>,
  ),
);
assert.equal(configuration("panel")?.material, "clear");
assert.equal(configuration("panel")?.edge, "diagonal");
// Popups default to the legible Regular material lit from the top and bottom.
assert.equal(configuration("popup")?.material, "regular");
assert.equal(configuration("popup")?.edge, "vertical");
assert.equal(
  document.getElementById("popup")?.getAttribute("data-glass-material"),
  "regular",
);
// A popup's own configuration still wins, and disabled popups stay ordinary.
assert.equal(configuration("custom")?.material, "clear");
assert.equal(configuration("custom")?.edge, "diagonal");
assert.equal(
  document.getElementById("ordinary")?.hasAttribute("data-glass"),
  false,
);
await act(async () => root.unmount());
await window.happyDOM.close();
console.log("popup glass defaults passed");
