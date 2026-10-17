import { Home, Search, Settings } from "lucide-react";
import { Profiler, type ReactNode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GlassSurface } from "../../../../packages/ui/src/components/glass";
import { TabBar } from "../../../../packages/ui/src/components/tab-bar";
import { SvgGlassRenderer } from "../../../../packages/ui/src/lib/glass/svg-renderer";
import GlassComparison from "../../src/examples/variants/glass-demo";
import {
  auditEnabled,
  metrics,
  recordFrames,
  resetMetrics,
  snapshot,
} from "./metrics";
import { svgFilterAudit } from "./svg-audit";
import "./style.css";

const filterSvg = SvgGlassRenderer.prototype.filter;
SvgGlassRenderer.prototype.filter = function (element, geometry) {
  const start = performance.now();
  try {
    return filterSvg.call(this, element, geometry);
  } finally {
    metrics.svgFilter.push(performance.now() - start);
  }
};
recordFrames();
const supportsLongTasks =
  PerformanceObserver.supportedEntryTypes.includes("longtask");
if (supportsLongTasks) {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      metrics.longTasks.push(entry.duration);
  }).observe({ type: "longtask", buffered: false });
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const items = [
  { value: "home", label: "Home", icon: <Home /> },
  { value: "search", label: "Search", icon: <Search /> },
  { value: "settings", label: "Settings", icon: <Settings /> },
];

async function stable(scene: HTMLElement) {
  const start = performance.now();
  let count = -1;
  let changed = start;
  while (performance.now() - start < 30000) {
    const surfaces = [...scene.querySelectorAll<HTMLElement>("[data-glass]")];
    const pending = surfaces.some(
      (surface) => surface.dataset.glassState === "loading",
    );
    const next = metrics.svgFilter.length;
    if (count !== next) {
      count = next;
      changed = performance.now();
    }
    if (!pending && performance.now() - changed > 600) {
      return {
        states: surfaces.map((surface) => surface.dataset.glassState),
        renderers: surfaces.map(
          (surface) => surface.dataset.glassRenderer ?? "css",
        ),
        elapsedMs: performance.now() - start,
      };
    }
    await pause(100);
  }
  return {
    states: [...scene.querySelectorAll<HTMLElement>("[data-glass]")].map(
      (surface) => surface.dataset.glassState,
    ),
    timeout: true,
    elapsedMs: performance.now() - start,
  };
}

const surfaceIds = Array.from({ length: 8 }, (_, index) => `surface-${index}`);

function Scene({ count, strength = 22 }: { count: number; strength?: number }) {
  const [value, setValue] = useState("home");
  return (
    <div className="benchmark-scene">
      <div className="benchmark-background">
        <p>Real DOM text, grid and colored panels behind the material</p>
      </div>
      <div className="benchmark-surfaces">
        {surfaceIds.slice(0, count).map((id) => (
          <GlassSurface
            className="benchmark-surface"
            key={id}
            glass={{ strength }}
          >
            Glass {id}
          </GlassSurface>
        ))}
      </div>
      <TabBar
        aria-label="Benchmark navigation"
        glass={{ strength }}
        items={items}
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}

async function drag(scene: HTMLElement) {
  const track = scene.querySelector<HTMLElement>("[data-slot=tab-bar-list]");
  const buttons = scene.querySelectorAll<HTMLButtonElement>("nav button");
  if (!track || buttons.length < 3)
    throw new Error("TabBar controls unavailable");
  const from = buttons[0].getBoundingClientRect();
  const to = buttons[2].getBoundingClientRect();
  const startX = from.x + from.width / 2;
  const endX = to.x + to.width / 2;
  const y = from.y + from.height / 2;
  // Synthetic pointer IDs do not participate in the browser's native capture
  // registry. Emulate only that registry while retaining the real React
  // handlers, GSAP tweens, geometry, glass runtime and DOM updates.
  const captureMethods = {
    setPointerCapture: track.setPointerCapture,
    hasPointerCapture: track.hasPointerCapture,
    releasePointerCapture: track.releasePointerCapture,
  };
  let captured = false;
  track.setPointerCapture = () => {
    captured = true;
  };
  track.hasPointerCapture = () => captured;
  track.releasePointerCapture = () => {
    captured = false;
  };
  const dispatch = (type: string, x: number, target: HTMLElement = track) => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 57,
        isPrimary: true,
        pointerType: "mouse",
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x,
        clientY: y,
      }),
    );
  };
  let held = false;
  let maximumContentScale = 1;
  let heldWork = snapshot();
  try {
    dispatch("pointerdown", startX, buttons[0]);
    await pause(450);
    held = track.dataset.pressed === "true";
    if (!held) throw new Error("Synthetic drag failed to enter held state");
    resetMetrics();
    for (let index = 1; index <= 60; index++) {
      dispatch("pointermove", startX + ((endX - startX) * index) / 60);
      await pause(16);
      for (const content of track.querySelectorAll<HTMLElement>(
        "[data-tab-bar-content]",
      )) {
        const transform = getComputedStyle(content).transform;
        if (transform !== "none") {
          const matrix = new DOMMatrixReadOnly(transform);
          maximumContentScale = Math.max(maximumContentScale, matrix.a);
        }
      }
    }
    heldWork = snapshot();
    dispatch("pointerup", endX);
    await pause(700);
  } finally {
    Object.assign(track, captureMethods);
  }
  const selected = scene.querySelector('[aria-current="page"]')?.textContent;
  if (selected !== "Settings")
    throw new Error(`Synthetic drag did not commit Settings: ${selected}`);
  return {
    generatedMoves: 60,
    held,
    maximumContentScale,
    heldWork,
    selected,
    textSelection: window.getSelection()?.toString(),
    method:
      "Fixture-generated pointer events with capture-registry shim; not native pointer latency",
  };
}

function Benchmark() {
  const sceneHost = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("baseline");
  const [report, setReport] = useState("");
  const [stage, setStage] = useState("Ready");

  async function run() {
    if (!sceneHost.current) return;
    setRunning(true);
    setReport("");
    const sceneRoot = createRoot(sceneHost.current);
    const data: Record<string, unknown> = {
      label,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      longTaskSupport: supportsLongTasks,
      methodology:
        "Local Vite development harness with the real production source. SVG filter times cover the displacement map and DOM definition updates; the browser's backdrop raster and paint show up in frame intervals. No CPU throttling. Dev React Profiler overhead applies equally to both runs.",
    };
    const profiled = (scene: ReactNode) => (
      <Profiler
        id="glass"
        onRender={(_, __, duration) => {
          metrics.commits++;
          metrics.reactMilliseconds += duration;
        }}
      >
        {scene}
      </Profiler>
    );
    try {
      for (const count of [1, 8]) {
        resetMetrics();
        setStage(`${count} surfaces`);
        sceneRoot.render(profiled(<Scene key={count} count={count} />));
        await pause(100);
        const ready = await stable(sceneHost.current);
        data[`svg-${count}`] = { ...snapshot(), ready };
        resetMetrics();
        await pause(2000);
        data[`svg-${count}-idle2s`] = snapshot();
        if (count !== 8) continue;
        setStage("TabBar long press and 60 moves");
        const interaction = await drag(sceneHost.current);
        const settled = await stable(sceneHost.current);
        data["svg-drag"] = { ...snapshot(), interaction, settled };
        resetMetrics();
        setStage("Strength-only update");
        sceneRoot.render(
          profiled(<Scene key={count} count={count} strength={34} />),
        );
        await pause(100);
        const strengthReady = await stable(sceneHost.current);
        data["svg-strength-only"] = { ...snapshot(), ready: strengthReady };
      }
    } catch (error) {
      data.error = String(error);
    } finally {
      sceneRoot.unmount();
      setReport(JSON.stringify(data, null, 2));
      setStage("Complete");
      setRunning(false);
    }
  }

  return (
    <main>
      <h1>Glass / TabBar local performance measurement</h1>
      <p>Keep the tab foreground and do not interact while a run is active.</p>
      <label>
        Run label{" "}
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <button type="button" onClick={run} disabled={running}>
        Run benchmark
      </button>
      <output aria-live="polite">{stage}</output>
      <div ref={sceneHost} />
      <pre id="benchmark-report">{report}</pre>
    </main>
  );
}

function Audit() {
  const [pixels, setPixels] = useState("");
  return (
    <main className="dark">
      <h1>Glass SVG audit</h1>
      <GlassComparison locale="zh-CN" />
      <button
        type="button"
        onClick={() =>
          void svgFilterAudit().then(
            (result) => setPixels(JSON.stringify(result)),
            (error) => setPixels(String(error)),
          )
        }
      >
        Inspect native SVG filter
      </button>
      <pre id="svg-filter-audit">{pixels}</pre>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Benchmark root missing");
createRoot(root).render(auditEnabled ? <Audit /> : <Benchmark />);
