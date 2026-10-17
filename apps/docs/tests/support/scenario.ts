import { writeSync } from "node:fs";
import { format } from "node:util";

/**
 * The fixture side of tests/support/fixture.ts. A DOM fixture stays one linear
 * script, because its scenarios share one rendered tree, and names its parts
 * with scenario(). The process reports each scenario on stdout, so the parent
 * test can show every scenario as its own test.
 */

export type ScenarioError = { name: string; message: string; stack?: string };

export type ScenarioEvent =
  | { start: string }
  | { end: string; error?: ScenarioError };

/** Marks the stdout lines that carry scenario events. */
export const scenarioEventPrefix = "[fixture-scenario] ";

let running: { name: string; consoleOutput: string[] } | undefined;

function emit(event: ScenarioEvent) {
  writeSync(1, `${scenarioEventPrefix}${JSON.stringify(event)}\n`);
}

/**
 * Ends the running scenario and names the fixture code that follows, up to the
 * next scenario() call or the end of the fixture. A failure stops the fixture,
 * so the scenarios after it are not run.
 */
export function scenario(name: string) {
  endScenario();
  running = { name, consoleOutput: [] };
  emit({ start: name });
}

/**
 * Reports the running scenario as passed, unless it wrote to console.error or
 * console.warn: then it throws, and the scenario fails with that output.
 */
export function endScenario() {
  if (!running) return;
  if (running.consoleOutput.length > 0) {
    throw new Error(
      `Unexpected console output:\n${running.consoleOutput.join("\n")}`,
    );
  }
  emit({ end: running.name });
  running = undefined;
}

/** Reports the running scenario as failed; false when none is running. */
export function failScenario(error: unknown) {
  if (!running) return false;
  emit({
    end: running.name,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { name: "Error", message: String(error) },
  });
  running = undefined;
  return true;
}

/**
 * Charges console.error and console.warn output, React warnings included, to
 * the running scenario. Output outside a scenario still reaches stderr.
 */
export function captureConsoleOutput() {
  for (const method of ["error", "warn"] as const) {
    const write = console[method];
    console[method] = (...data: unknown[]) => {
      if (running) running.consoleOutput.push(format(...data));
      else write(...data);
    };
  }
}
