import { strict as assert } from "node:assert";
import { installDom } from "../support/dom";
import { scenario } from "../support/scenario";

const window = installDom("http://localhost");
const document = window.document;

const React = await import("react");
const { act } = React;
const { createRoot } = await import("react-dom/client");
const { lazyComponent } = await import("@workspace/ui/lib/lazy-component");

let loads = 0;
const Heavy = lazyComponent<{ name: string }>(async () => {
  loads += 1;
  if (loads === 1) throw new Error("offline");
  return { default: ({ name }) => <p>Hello {name}</p> };
});

class Boundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  retry = () => this.setState({ failed: false });
  render() {
    return this.state.failed ? (
      <button type="button" onClick={this.retry}>
        Retry
      </button>
    ) : (
      this.props.children
    );
  }
}

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
const boundary = React.createRef<Boundary>();
// React reports the caught load error; it is the case under test.
const consoleError = console.error;
console.error = () => {};

scenario("nothing loads before the component renders");
assert.equal(loads, 0);

scenario("a failed load reaches the error boundary");
await act(async () => {
  root.render(
    <Boundary ref={boundary}>
      <Heavy name="SUI" fallback={<span>Loading</span>} />
    </Boundary>,
  );
});
assert.equal(loads, 1);
assert.equal(host.textContent, "Retry");

scenario("retrying after a failure loads the module again");
await act(async () => boundary.current?.retry());
assert.equal(loads, 2, "the failed load is not cached");
assert.equal(host.textContent, "Hello SUI");

console.error = consoleError;
await act(async () => root.unmount());
await window.happyDOM.abort();
