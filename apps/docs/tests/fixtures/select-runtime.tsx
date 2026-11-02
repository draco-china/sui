import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new HappyWindow({
  url: "http://localhost",
  width: 1280,
  height: 800,
}) as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  DocumentFragment: window.DocumentFragment,
  ShadowRoot: window.ShadowRoot,
  SVGElement: window.SVGElement,
  MutationObserver: window.MutationObserver,
  ResizeObserver: window.ResizeObserver,
  KeyboardEvent: window.KeyboardEvent,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: window.navigator,
});
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { fireEvent } = await import("@testing-library/react");
const {
  Select,
  SelectChip,
  SelectChips,
  SelectChipsInput,
  SelectContent,
  SelectGroup,
  SelectInput,
  SelectSearch,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectTrigger,
  SelectValue,
  useSelectAnchor,
} = await import("@workspace/ui/components/select");

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "mango", label: "Mango" },
];

async function render(node: React.ReactNode) {
  await act(async () => root.render(node));
}

function query<T extends Element = HTMLElement>(selector: string) {
  return document.querySelector<T>(selector);
}

function items() {
  return [
    ...document.querySelectorAll(
      '[data-slot="select-content"] [data-slot="select-item"]',
    ),
  ].map((item) => item.textContent);
}

function popupInputs() {
  return document.querySelectorAll('[data-slot="select-content"] input').length;
}

function hiddenPopupInputs() {
  return document.querySelectorAll(
    '[data-slot="select-content"] .sr-only input',
  ).length;
}

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
}

async function click(element: Element | null) {
  assert.ok(element);
  await act(async () => {
    fireEvent.click(element);
  });
}

function PlainSelect({
  search = false,
  onValueChange,
}: {
  search?: boolean;
  onValueChange?: (value: string | null) => void;
}) {
  return (
    <Select items={fruits} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        {search && <SelectSearch />}
        <SelectList>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            {fruits.map((fruit) => (
              <SelectItem key={fruit.value} value={fruit.value}>
                {fruit.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectList>
      </SelectContent>
    </Select>
  );
}

scenario("a plain trigger shows the placeholder, then the picked label");
const picked: (string | null)[] = [];
await render(<PlainSelect onValueChange={(value) => picked.push(value)} />);
assert.equal(
  query('[data-slot="select-trigger"]')?.textContent,
  "Pick a fruit",
);
await click(query('[data-slot="select-trigger"]'));
assert.deepEqual(items(), ["Apple", "Banana", "Mango"]);
await click(
  [...document.querySelectorAll('[data-slot="select-item"]')].find(
    (item) => item.textContent === "Banana",
  ) ?? null,
);
assert.deepEqual(picked, ["banana"]);
assert.equal(query('[data-slot="select-trigger"]')?.textContent, "Banana");

scenario(
  "a plain trigger gets only a hidden, read-only input for the keyboard",
);
await render(<PlainSelect />);
await click(query('[data-slot="select-trigger"]'));
assert.equal(popupInputs(), 1, "the popup needs an input for the keyboard");
assert.equal(hiddenPopupInputs(), 1);
assert.equal(
  query<HTMLInputElement>('[data-slot="select-content"] input')?.readOnly,
  true,
  "typing into the hidden input must not filter the list unseen",
);

scenario("SelectSearch shows a search box that filters static items");
await render(null);
await render(<PlainSelect search />);
await click(query('[data-slot="select-trigger"]'));
assert.equal(popupInputs(), 1);
assert.equal(hiddenPopupInputs(), 0);
const search = query<HTMLInputElement>('[data-slot="select-content"] input');
assert.ok(search);
await type(search, "an");
assert.deepEqual(items(), ["Banana", "Mango"]);
await type(search, "zzz");
assert.deepEqual(items(), []);
assert.equal(
  query('[data-slot="select-label"]'),
  null,
  "a group left without items is dropped",
);

scenario("SelectSearch replaces the hidden input");
await render(
  <Select items={fruits}>
    <SelectTrigger aria-label="Fruit">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectSearch placeholder="Find" />
      <SelectList>
        {(fruit: (typeof fruits)[number]) => (
          <SelectItem key={fruit.value} value={fruit}>
            {fruit.label}
          </SelectItem>
        )}
      </SelectList>
    </SelectContent>
  </Select>,
);
await click(query('[data-slot="select-trigger"]'));
assert.equal(popupInputs(), 1);
assert.equal(
  query<HTMLInputElement>('[data-slot="select-content"] input')?.placeholder,
  "Find",
);

scenario("an input trigger keeps the popup free of a search box");
await render(
  <Select items={["Apple", "Banana"]}>
    <SelectInput placeholder="Fruit" />
    <SelectContent>
      <SelectList>
        {(fruit: string) => (
          <SelectItem key={fruit} value={fruit}>
            {fruit}
          </SelectItem>
        )}
      </SelectList>
    </SelectContent>
  </Select>,
);
const trigger = query<HTMLInputElement>('[data-slot="select-input"]');
assert.ok(trigger);
await type(trigger, "ban");
assert.equal(popupInputs(), 0);
assert.deepEqual(items(), ["Banana"]);

scenario("chips mode registers its input and shows the picked values");
function Chips() {
  const anchor = useSelectAnchor();
  return (
    <Select multiple items={["Apple", "Banana"]} defaultValue={["Apple"]}>
      <SelectChips ref={anchor}>
        <SelectValue>
          {(values: string[]) => (
            <>
              {values.map((value) => (
                <SelectChip key={value}>{value}</SelectChip>
              ))}
              <SelectChipsInput aria-label="Fruits" />
            </>
          )}
        </SelectValue>
      </SelectChips>
      <SelectContent anchor={anchor}>
        <SelectList>
          {(fruit: string) => (
            <SelectItem key={fruit} value={fruit}>
              {fruit}
            </SelectItem>
          )}
        </SelectList>
      </SelectContent>
    </Select>
  );
}
await render(<Chips />);
assert.deepEqual(
  [...document.querySelectorAll('[data-slot="select-chip"]')].map(
    (chip) => chip.textContent,
  ),
  ["Apple"],
);
const chipsInput = query<HTMLInputElement>('[data-slot="select-chip-input"]');
assert.ok(chipsInput);
await act(async () => {
  chipsInput.focus();
  fireEvent.keyDown(chipsInput, { key: "ArrowDown" });
});
await type(chipsInput, "b");
assert.equal(popupInputs(), 0);
assert.deepEqual(items(), ["Banana"]);

await act(async () => root.unmount());
await window.happyDOM.abort();
