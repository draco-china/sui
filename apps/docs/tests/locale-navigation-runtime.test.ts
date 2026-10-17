import { describeFixture } from "./support/fixture";

describeFixture(
  "Documentation header locale navigation",
  "locale-navigation-runtime.tsx",
  { bunArgs: ["--conditions=browser"] },
);
