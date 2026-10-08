import { Home, Search, Settings } from "lucide-react";
import { Profiler, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GlassProvider,
  GlassSurface,
} from "../../../../packages/ui/src/components/glass";
import { TabBar } from "../../../../packages/ui/src/components/tab-bar";
import {
  type GlassFrame,
  GlassRenderer,
} from "../../../../packages/ui/src/lib/glass/renderer";
import {
  instrumentGpu,
  measure,
  metrics,
  resetMetrics,
  snapshot,
  summary,
} from "./metrics";
import "../../../../packages/ui/src/styles/globals.css";
import "./style.css";

instrumentGpu();
const render = GlassRenderer.prototype.render;
GlassRenderer.prototype.render = function (source, frame) {
  return measure("render", () => render.call(this, source, frame));
};
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
const focusedDrag =
  new URLSearchParams(location.search).get("scenario") === "auto-drag";

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
    const next = metrics.capture.length + metrics.render.length;
    if (count !== next) {
      count = next;
      changed = performance.now();
    }
    if (!pending && performance.now() - changed > 600) {
      return {
        states: surfaces.map((surface) => surface.dataset.glassState),
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

function sourceCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  for (let y = 0; y < 540; y += 30) {
    for (let x = 0; x < 960; x += 30) {
      context.fillStyle = (x + y) % 60 ? "#007aff" : "#34c759";
      context.fillRect(x, y, 30, 30);
    }
  }
  return canvas;
}

async function rendererBenchmark() {
  const start = performance.now();
  const renderer = await GlassRenderer.create();
  const initializationMs = performance.now() - start;
  const frame: GlassFrame = {
    width: 240,
    height: 100,
    margin: 0,
    origin: [80, 80],
    radius: [24, 24, 24, 24],
    strength: 22,
    blur: 8,
    tint: [1, 1, 1],
    tintOpacity: 0.6,
    foreground: [0, 0, 0],
    minimumContrast: 0,
  };
  try {
    const cold: number[] = [];
    const cached: number[] = [];
    for (let index = 0; index < 8; index++) {
      const source = sourceCanvas();
      const sample = performance.now();
      await renderer.render(source, frame);
      cold.push(performance.now() - sample);
    }
    const shared = sourceCanvas();
    await renderer.render(shared, frame);
    const beforeCachedUploads = metrics.uploads;
    for (let index = 0; index < 12; index++) {
      const sample = performance.now();
      await renderer.render(shared, frame);
      cached.push(performance.now() - sample);
    }
    return {
      initializationMs,
      newBackground: summary(cold),
      cachedBackground: summary(cached),
      cachedUploads: metrics.uploads - beforeCachedUploads,
      sourcePixels: [960, 540],
      outputCssPixels: [240, 100],
      devicePixelRatio: window.devicePixelRatio,
    };
  } finally {
    renderer.destroy();
  }
}

const surfaceIds = Array.from({ length: 8 }, (_, index) => `surface-${index}`);

function Scene({
  count,
  mode,
  highlight = 0.3,
}: {
  count: number;
  mode: "auto" | "css";
  highlight?: number;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("home");
  return (
    <div className="benchmark-scene" ref={target}>
      <div className="benchmark-background">
        <p>Real DOM text, grid and colored panels behind the material</p>
      </div>
      <GlassProvider
        captureTarget={target}
        mode={mode}
        intensity="sm"
        options={{ highlight }}
      >
        <div className="benchmark-surfaces">
          {surfaceIds.slice(0, count).map((id) => (
            <GlassSurface className="benchmark-surface" key={id}>
              Glass {id}
            </GlassSurface>
          ))}
        </div>
        <TabBar
          aria-label="Benchmark navigation"
          glass
          items={items}
          value={value}
          onValueChange={setValue}
        />
      </GlassProvider>
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
  // handlers, GSAP tweens, geometry, glass renderer and DOM updates.
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
    const heldBaseline = {
      capture: metrics.capture.length,
      render: metrics.render.length,
      uploads: metrics.uploads,
    };
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
    heldWork = {
      ...snapshot(),
      capture: summary(metrics.capture.slice(heldBaseline.capture)),
      render: summary(metrics.render.slice(heldBaseline.render)),
      uploads: metrics.uploads - heldBaseline.uploads,
    };
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
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      longTaskSupport: supportsLongTasks,
      scenario: focusedDrag ? "auto-drag diagnostic reproduction" : "full",
      methodology:
        "Local Vite development harness, real production source, vgpu + WGSL. Renderer times include queue, GPU completion, readback and PNG serialization. DOM capture measures full captureGlassBackground. No CPU throttling. Dev React Profiler overhead applies equally to both runs.",
    };
    try {
      if (!focusedDrag) {
        resetMetrics();
        setStage("Renderer: new and cached backgrounds");
        try {
          data.renderer = await rendererBenchmark();
        } catch (error) {
          data.renderer = { error: String(error) };
        }
      }
      const modes: readonly ("css" | "auto")[] = focusedDrag
        ? ["auto"]
        : ["css", "auto"];
      const counts = focusedDrag ? [8] : [1, 8];
      for (const mode of modes) {
        for (const count of counts) {
          resetMetrics();
          setStage(`${mode}: ${count} surfaces`);
          sceneRoot.render(
            <Profiler
              id="glass"
              onRender={(_, __, duration) => {
                metrics.commits++;
                metrics.reactMilliseconds += duration;
              }}
            >
              <Scene key={`${mode}-${count}`} count={count} mode={mode} />
            </Profiler>,
          );
          await pause(100);
          const ready = await stable(sceneHost.current);
          data[`${mode}-${count}`] = { ...snapshot(), ready };
          resetMetrics();
          await pause(2000);
          data[`${mode}-${count}-idle2s`] = snapshot();
          if (count === 8) {
            resetMetrics();
            setStage(`${mode}: TabBar long press and 60 moves`);
            const interaction = await drag(sceneHost.current);
            const settled = await stable(sceneHost.current);
            data[`${mode}-drag`] = { ...snapshot(), interaction, settled };
            resetMetrics();
            setStage(`${mode}: highlight-only update`);
            sceneRoot.render(
              <Profiler
                id="glass"
                onRender={(_, __, duration) => {
                  metrics.commits++;
                  metrics.reactMilliseconds += duration;
                }}
              >
                <Scene
                  key={`${mode}-${count}`}
                  count={count}
                  mode={mode}
                  highlight={0.5}
                />
              </Profiler>,
            );
            await pause(100);
            const highlightReady = await stable(sceneHost.current);
            data[`${mode}-highlight-only`] = {
              ...snapshot(),
              ready: highlightReady,
            };
          }
        }
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

const root = document.getElementById("root");
if (!root) throw new Error("Benchmark root missing");
createRoot(root).render(<Benchmark />);
