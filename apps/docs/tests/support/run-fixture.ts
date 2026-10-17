import { captureConsoleOutput, endScenario, failScenario } from "./scenario";

// Entry point of a fixture process: `bun run-fixture.ts <fixture path>`.
function failRunningScenario(error: unknown) {
  if (!failScenario(error)) return;
  // Timers of the abandoned DOM would otherwise keep the process alive.
  process.exit(1);
}

for (const event of ["uncaughtException", "unhandledRejection"] as const) {
  process.on(event, (error: unknown) => {
    failRunningScenario(error);
    console.error(error);
    process.exit(1);
  });
}
captureConsoleOutput();
try {
  await import(process.argv[2] ?? "");
  endScenario();
} catch (error) {
  failRunningScenario(error);
  // An error outside every scenario stays uncaught, so it reaches stderr.
  throw error;
}
