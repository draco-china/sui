# Glass / TabBar performance results

Measured on 2026-10-08 in foreground Chrome 155 on macOS, with DPR 2 and
reduced motion disabled. The preserved full runs are
[baseline.json](./results/baseline.json) at 07:03 UTC and
[optimized.json](./results/optimized.json) at 07:51 UTC.

These measurements drove changes to the actual Glass runtime and capture
pipeline. They are local development measurements, not universal speed or
frame-rate guarantees.

## Main result

The CSS + SVG drag case previously spent substantial main-thread time
rescanning surfaces and rereading materials even though it required no DOM
capture or GPU rendering. Separating material work from geometric movement
reduced that work in the final run:

| CSS + SVG drag | Baseline | Optimized |
| --- | ---: | ---: |
| Long tasks over 50ms | 32 | 1 |
| Total long-task duration | 2109ms | 56ms |
| Long-task p95 | 119ms | 56ms |
| Captures / GPU renders / uploads | 0 / 0 / 0 | 0 / 0 / 0 |

Earlier optimization iterations observed 1–3 CSS drag long tasks, with total
durations of 52ms, 139ms and 217ms. The final run is therefore evidence of a
large local reduction, not a promise of exactly one long task on every run.

## Correctness and retained work

| Optimized scenario | Result |
| --- | --- |
| Eight Glass surfaces plus TabBar track | 1 DOM capture, 1 image upload, 9 GPU renders |
| Shared initial capture duration | 40.9ms, one sample |
| All four two-second idle cases | 0 captures, GPU renders, uploads, React commits and long tasks |
| Whole scene during held interval | 0 captures, 0 uploads, 6 render calls from other automatic Glass surfaces |
| TabBar lens | CSS + SVG only; no GPU renderer, frame image or screenshot texture |
| Highlight-only update after drag settles | 0 captures, GPU renders and uploads |
| Drag state | Held state reached; content scale 1.2; Settings selected on release; no text selection |

The automatic drag scenario includes press activation, movement, release and
settling. Its complete totals are 4 captures, 3 uploads and 25 renders; the
held-interval counters above cover movement between the 450ms hold delay and
pointer release. Additional work at activation and release is reported, not
hidden. The final user requirement intentionally changes the long-press
lens to a local CSS + SVG scope. A subsequent styling change removes its
backdrop blur and tint entirely, retaining only SVG edge decoration and the
floating outer shadow. The dark edge shading was also moved outside the surface. That final styling change followed the saved timing run;
the runtime and capture paths are unchanged. The surrounding TabBar track and other automatic Glass
surfaces still use the CSS + SVG first paint followed by vgpu + WGSL
enhancement. The lens resets inherited frame image variables and does not
sample or display its parent's GPU frame as its own image background.
Its SVG decoration uses elongated top-left and bottom-right highlights with
top-right and bottom-left outer shading.

Diagnostics exposed a capture correctness defect: the URL validator treated
`url(%23light0)` inside an encoded SVG data URI as an external resource.
Nested lens captures could fail repeatedly without a corresponding texture
upload. The corrected parser consumes the complete quoted CSS URL before
checking subsequent resources. A focused diagnostic then recorded one
successful nested lens capture and upload, no embedding errors, and cache
acceptance. This fixes nested automatic Glass capture independently of the
subsequent decision to keep the TabBar lens in CSS mode.

The original automatic drag results do not establish a correctly working
nested GPU lens. Comparing its smaller render count with the final count
would reward failed work; comparing it with the final CSS-only lens would
also conflate an intentional behavior change with an optimization. Likewise,
the original highlight-only case did not
wait for all preceding drag work to settle, so its ten render calls cannot be
attributed solely to changing the highlight. The final zero-work result is
verified after settling; a ten-to-zero performance comparison is not claimed.

## Direct renderer measurements

The renderer test uses a real 960×540 canvas, a 240×100 CSS-pixel output,
WGSL refraction and Gaussian blur, and actual native GPU uploads. Renderer
initialization is separate from eight fresh-background samples and twelve
cached-background samples.

| Duration | Baseline median / p95 | Optimized median / p95 |
| --- | ---: | ---: |
| New background | 16.7 / 18.2ms | 16.6 / 17.4ms |
| Cached background | 16.8 / 18.3ms | 3.3 / 17.9ms |
| Cached background uploads | 0 | 0 |

The cached median is lower in this final run, but earlier optimized runs
remained near 16.7ms. These observations do not establish a general renderer
speed improvement. They include queue waiting, GPU completion, pixel readback
and PNG export,
and should not be described as pure CPU or shader execution time. They do
verify that cached backgrounds avoid repeated uploads. Initialization took
9.3ms and 17.2ms in the two saved runs, respectively; these individual
observations do not demonstrate a startup improvement.

## Changes supported by the measurements

- Separate structural and material invalidation from geometry-only movement;
  avoid scanning every surface or rereading its native background per tween.
- Cache material reads and SVG edge inputs; translating a surface reuses an
  unchanged highlight rather than regenerating it.
- Retain shared snapshots, uploaded textures and blur targets, and preserve
  the last decoded frame while a replacement is in progress.
- Keep layered capture exclusions stable and omit navigation item icons and
  labels from captured decoration. The final TabBar lens itself uses a local
  CSS + SVG provider with no frame image; the surrounding track retains its
  automatic Glass mode.
- Remove redundant Glass custom properties from capture clones and parse
  quoted CSS resource URLs correctly without weakening external-resource
  validation.
- Keep SVG highlight parameters separate from private WGSL frame parameters,
  so changing an edge highlight does not itself require a GPU frame.

## Method and limits

The local Vite harness imports production component and runtime source. It
uses React development profiling; it is not a production bundle benchmark.
The renderer uses `vgpu` 0.5.0, WGSL and the native browser GPU. TabBar motion
uses GSAP 3.15.0. There is no CPU or GPU throttling, and these runs do not
identify the GPU model or establish performance on another browser or device.

The benchmark's run button generates a primary-pointer hold and 60 pointer
moves at requested 16ms intervals. A test-only pointer-capture registry shim
lets those synthetic pointer IDs exercise the actual React handlers, GSAP,
geometry, capture and rendering. Timers can run late under load. This measures
component processing, not native input latency or guaranteed 60fps.

Capture timing covers the full `captureGlassBackground` operation, including
DOM serialization, resource handling and rasterization. React Profiler
duration covers React render work; browser long-task duration captures a
different main-thread boundary. Capture counters include failed attempts,
which is why capture success was investigated separately. One-sample capture
results have no meaningful distribution beyond that observation.

Diagnostic stack and resource logging is opt-in and disabled for the saved
full performance runs. The focused diagnostic skips other cases and must not
be compared as an equivalent full benchmark. Repeat the full run with the
same foreground browser, viewport and settings when assessing another
change. Use [README.md](./README.md) for the commands and report comparison.
