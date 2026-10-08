import { strict as assert } from "node:assert";
import { registerEditorHighlighter } from "../../../../packages/ui/src/lib/editor/monaco-theme";
import {
  codeToViewerTokens,
  getViewerHighlighter,
} from "../../../../packages/ui/src/lib/viewer/shiki";

const { shikiToMonaco } = await import(
  Bun.resolveSync(
    "@shikijs/monaco",
    new URL("../../../../packages/ui/src", import.meta.url).pathname,
  )
);
type TokenizerState = object;
type Provider = {
  getInitialState: () => TokenizerState;
  tokenize: (
    line: string,
    state: TokenizerState,
  ) => {
    tokens: { startIndex: number; scopes: string }[];
    endState: TokenizerState;
  };
};
function registry(ids: string[]) {
  const providers = new Map<string, Provider>();
  const installations: string[] = [];
  const monaco = {
    languages: {
      getLanguages: () => ids.map((id) => ({ id })),
      setTokensProvider: (id: string, provider: Provider) => {
        assert(
          ids.includes(id),
          `cannot install a provider for an unregistered native language: ${id}`,
        );
        installations.push(id);
        providers.set(id, provider);
        return { dispose() {} };
      },
    },
    editor: { defineTheme() {}, setTheme() {}, create() {} },
  } as unknown as Parameters<typeof registerEditorHighlighter>[1];
  return { monaco, providers, installations };
}
function compare(
  actual: Provider | undefined,
  expected: Provider | undefined,
  lines: string[],
) {
  assert(actual);
  assert(expected);
  let state: TokenizerState = actual.getInitialState();
  let reference: TokenizerState = expected.getInitialState();
  let boundaries = 0;
  for (const line of lines) {
    const result: ReturnType<Provider["tokenize"]> = actual.tokenize(
      line,
      state,
    );
    const baseline: ReturnType<Provider["tokenize"]> = expected.tokenize(
      line,
      reference,
    );
    assert.deepEqual(
      result.tokens,
      baseline.tokens,
      "mapped native tokenizer must retain the actual JSX grammar token boundaries and scopes",
    );
    state = result.endState;
    reference = baseline.endState;
    boundaries += result.tokens.length;
  }
  assert(
    boundaries > lines.length,
    "real grammar produces syntax token boundaries",
  );
}
const { instance } = await getViewerHighlighter("jsx", "light");
assert.deepEqual(instance.getLoadedLanguages(), ["jsx"]);
const jsxGrammar = instance.getLanguage("jsx");
const cold = registry(["javascript"]);
registerEditorHighlighter(instance, cold.monaco);
assert.deepEqual(
  cold.installations,
  ["javascript"],
  "cold JSX gets a native JS model tokenizer",
);
const jsxReference = registry(["jsx"]);
shikiToMonaco(instance, jsxReference.monaco);
const jsx = [
  "const view = <Panel enabled>",
  "  {flag ? <span>Text</span> : null}",
  "</Panel>;",
  "const next = 42;",
];
await codeToViewerTokens(jsx.join("\n"), "jsx", "light");
compare(
  cold.providers.get("javascript"),
  jsxReference.providers.get("jsx"),
  jsx,
);
assert.equal(
  instance.getLanguage("jsx"),
  jsxGrammar,
  "the shared grammar object is preserved",
);

await getViewerHighlighter("javascript", "light");
const afterJavaScript = registry(["javascript"]);
registerEditorHighlighter(instance, afterJavaScript.monaco);
assert.deepEqual(
  afterJavaScript.installations,
  ["javascript"],
  "loading base JS later cannot overwrite its JSX superset",
);
compare(
  afterJavaScript.providers.get("javascript"),
  jsxReference.providers.get("jsx"),
  jsx,
);

await getViewerHighlighter("typescript", "light");
const typeScript = registry(["typescript"]);
registerEditorHighlighter(instance, typeScript.monaco);
const tsReference = registry(["typescript"]);
shikiToMonaco(instance, tsReference.monaco);
assert.deepEqual(typeScript.installations, ["typescript"]);
compare(
  typeScript.providers.get("typescript"),
  tsReference.providers.get("typescript"),
  ["type Value = number;", "const value: Value = 3;"],
);

await getViewerHighlighter("tsx", "light");
const tsxGrammar = instance.getLanguage("tsx");
const mixed = registry(["typescript", "javascript"]);
registerEditorHighlighter(instance, mixed.monaco);
assert.deepEqual(
  mixed.installations.sort(),
  ["javascript", "typescript"],
  "each native language gets only one superset provider",
);
const tsxReference = registry(["tsx"]);
shikiToMonaco(instance, tsxReference.monaco);
await codeToViewerTokens(
  "const view: React.ReactNode = <Panel enabled>\n  {flag ? <span>Text</span> : null}\n</Panel>;",
  "tsx",
  "light",
);
compare(mixed.providers.get("typescript"), tsxReference.providers.get("tsx"), [
  "const view: React.ReactNode = <Panel enabled>",
  "  {flag ? <span>Text</span> : null}",
  "</Panel>;",
  "const next: number = 42;",
]);
compare(
  mixed.providers.get("javascript"),
  jsxReference.providers.get("jsx"),
  jsx,
);
assert.equal(instance.getLanguage("tsx"), tsxGrammar);

await getViewerHighlighter("json", "light");
const unrelated = registry(["json"]);
registerEditorHighlighter(instance, unrelated.monaco);
assert.deepEqual(
  unrelated.installations,
  ["json"],
  "preloaded viewer TSX/JSX cannot register unknown native model languages",
);
console.log(
  "actual official JSX/TSX tokenizers, native model mapping, multiline state, base suppression and unrelated languages passed",
);
