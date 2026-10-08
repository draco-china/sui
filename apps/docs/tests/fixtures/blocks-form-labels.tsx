import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  window,
  document: window.document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Node: window.Node,
  SVGElement: window.SVGElement,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  ResizeObserver: window.ResizeObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const { act } = await import("react");
const { render, cleanup, fireEvent } = await import("@testing-library/react");
const { BugReportForm, ProfileForm } = await import(
  "@workspace/ui/blocks/tanstack-form"
);
const { chineseBugReportFormLabels, chineseProfileFormLabels } = await import(
  "../../src/examples/variants/block-form-labels"
);
async function until(condition: () => boolean) {
  for (let index = 0; index < 30 && !condition(); index++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  assert.ok(condition(), "Async form state did not settle");
}
const english = render(<BugReportForm onSubmit={() => {}} />);
assert.ok(english.getByText("Bug report"));
assert.ok(english.getByRole("button", { name: "Submit report" }));
fireEvent.blur(english.getByLabelText("Title"));
await until(
  () => !!english.queryByText("Title must be at least 5 characters."),
);
assert.equal(
  english.getByLabelText("Title").getAttribute("aria-invalid"),
  "true",
);
cleanup();

let fail = true;
let submitted: { title: string; description: string } | undefined;
const translated = render(
  <BugReportForm
    labels={chineseBugReportFormLabels}
    onSubmit={async (values) => {
      submitted = values;
      if (fail) throw "network unavailable";
    }}
  />,
);
assert.ok(translated.getByText("报告问题"));
assert.ok(translated.getByPlaceholderText("手机上的登录按钮无法使用"));
const title = translated.getByLabelText("标题");
const description = translated.getByLabelText("问题描述");
fireEvent.blur(title);
await until(() => !!translated.queryByText("标题至少 5 个字符。"));
fireEvent.change(title, { target: { value: "x".repeat(81) } });
fireEvent.blur(title);
await until(() => !!translated.queryByText("标题最多 80 个字符。"));
fireEvent.blur(description);
await until(() => !!translated.queryByText("描述至少 20 个字符。"));
fireEvent.change(description, { target: { value: "x".repeat(501) } });
fireEvent.blur(description);
await until(() => !!translated.queryByText("描述最多 500 个字符。"));
fireEvent.change(title, { target: { value: "  Valid report  " } });
fireEvent.change(description, {
  target: { value: "  Reproduce this issue on mobile.  " },
});
fireEvent.blur(title);
fireEvent.blur(description);
await until(
  () =>
    !translated.queryByText("标题最多 80 个字符。") &&
    !translated.queryByText("描述最多 500 个字符。"),
);
const form = translated.container.querySelector("form");
assert.ok(form);
await act(async () => {
  fireEvent.submit(form);
});
await until(() => !!translated.queryByText("提交失败"));
assert.ok(translated.getByText("提交失败"));
assert.ok(translated.getByText("请稍后重试。"));
assert.deepEqual(submitted, {
  title: "Valid report",
  description: "Reproduce this issue on mobile.",
});
fail = false;
await act(async () => {
  fireEvent.submit(form);
});
await until(() => !!translated.queryByText("已保存"));
assert.ok(translated.getByText("已保存"));
assert.ok(translated.getByText("更改已成功提交。"));
fireEvent.click(translated.getByRole("button", { name: "重置" }));
assert.equal((title as HTMLInputElement).value, "");
assert.equal(translated.queryByRole("status"), null);
cleanup();

const profile = render(
  <ProfileForm
    labels={chineseProfileFormLabels}
    initialValues={{ role: "developer" }}
    onSubmit={() => {}}
  />,
);
assert.ok(profile.getByText("个人资料"));
assert.ok(profile.getByText("开发者"));
assert.ok(profile.getByRole("checkbox", { name: "接收产品更新邮件" }));
fireEvent.blur(profile.getByLabelText("邮箱"));
await until(() => !!profile.queryByText("请输入有效的邮箱。"));
fireEvent.change(profile.getByLabelText("姓名"), {
  target: { value: "x".repeat(51) },
});
fireEvent.blur(profile.getByLabelText("姓名"));
await until(() => !!profile.queryByText("姓名最多 50 个字符。"));
cleanup();

let finishSubmission: (() => void) | undefined;
const pending = render(
  <ProfileForm
    labels={chineseProfileFormLabels}
    initialValues={{
      name: "Alex",
      email: "alex@example.com",
      role: "developer",
    }}
    onSubmit={() =>
      new Promise<void>((resolve) => {
        finishSubmission = resolve;
      })
    }
  />,
);
const pendingForm = pending.container.querySelector("form");
assert.ok(pendingForm);
await act(async () => {
  fireEvent.submit(pendingForm);
});
await until(() => !!pending.queryByRole("status", { name: "正在提交…" }));
assert.equal(
  (pending.getByLabelText("姓名") as HTMLInputElement).disabled,
  true,
);
assert.equal(
  (pending.getByRole("button", { name: "重置" }) as HTMLButtonElement).disabled,
  true,
);
await act(async () => {
  finishSubmission?.();
});
await until(() => !!pending.queryByText("已保存"));
assert.equal(
  (pending.getByLabelText("姓名") as HTMLInputElement).disabled,
  false,
);
cleanup();

const partial = render(
  <ProfileForm labels={{ submit: "保存" }} onSubmit={() => {}} />,
);
assert.ok(partial.getByRole("button", { name: "保存" }));
assert.ok(partial.getByLabelText("Name"));
assert.ok(partial.getByRole("button", { name: "Reset" }));
cleanup();
console.log(
  "English defaults, external Chinese validation and feedback, reset and partial overrides passed",
);
await window.happyDOM.abort();
