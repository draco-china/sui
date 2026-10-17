import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  type ScenarioError,
  type ScenarioEvent,
  scenarioEventPrefix,
} from "./scenario";

type ScenarioRun = { name: string; ended: boolean; error?: ScenarioError };

function readScenarios(stdout: string) {
  const scenarios: ScenarioRun[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.startsWith(scenarioEventPrefix)) continue;
    const event: ScenarioEvent = JSON.parse(
      line.slice(scenarioEventPrefix.length),
    );
    if ("start" in event) {
      scenarios.push({ name: event.start, ended: false });
      continue;
    }
    const scenario = scenarios.at(-1);
    if (scenario?.name !== event.end) {
      throw new Error(`Scenario "${event.end}" ended without starting`);
    }
    Object.assign(scenario, { ended: true, error: event.error });
  }
  return scenarios;
}

function exitReason(result: Bun.SyncSubprocess) {
  if (result.exitedDueToTimeout) return "it timed out";
  if (result.signalCode) return `signal ${result.signalCode}`;
  return `exit code ${result.exitCode}`;
}

function fixtureError({ name, message, stack = "" }: ScenarioError) {
  // Bun prints where the parent threw, so the fixture frames join the message.
  const frames = stack
    .split("\n")
    .filter((line) => line.trimStart().startsWith("at "));
  const error = new Error([message.trimEnd(), "", ...frames].join("\n"));
  error.name = name;
  return error;
}

/**
 * Runs a DOM fixture in its own Bun process, so the globals it installs never
 * reach other tests, and reports each scenario() of the fixture as a test.
 * The fixture runs while Bun collects the tests, because the run names them.
 * A failed scenario stops the fixture, so later scenarios are not listed.
 */
export function describeFixture(
  title: string,
  fixture: string,
  { bunArgs = [] }: { bunArgs?: string[] } = {},
) {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      ...bunArgs,
      join(import.meta.dir, "run-fixture.ts"),
      join(import.meta.dir, "../fixtures", fixture),
    ],
    cwd: join(import.meta.dir, "../.."),
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  });
  const stderr = result.stderr.toString();
  const scenarios = readScenarios(result.stdout.toString());
  const failed = scenarios.some(({ ended, error }) => error || !ended);

  describe(title, () => {
    for (const { name, ended, error } of scenarios) {
      test(name, () => {
        if (error) throw fixtureError(error);
        if (!ended) {
          throw new Error(
            `${fixture} ended during this scenario (${exitReason(result)}):\n${stderr}`,
          );
        }
      });
    }

    test(`${fixture} sets up, runs its scenarios and exits cleanly`, () => {
      expect(stderr).toBe("");
      expect(result.exitCode).toBe(failed ? 1 : 0);
      expect(scenarios.length).toBeGreaterThan(0);
    });
  });
}
