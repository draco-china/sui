import { strict as assert } from "node:assert";
import { installDom, waitFor } from "../support/dom";
import { scenario } from "../support/scenario";

const window = installDom("http://localhost/form", {
  width: 1280,
  height: 800,
});
const document = window.document;
const { MotionGlobalConfig } = await import("motion/react");
MotionGlobalConfig.skipAnimations = true;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { fireEvent } = await import("@testing-library/react");
const ui = await import("@workspace/ui/components/data-form");
const { Input } = await import("@workspace/ui/components/input");
type Instance = import("@workspace/ui/components/data-form").DataFormInstance;
type Field = import("@workspace/ui/components/data-form").DataFormFieldConfig;

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);

async function settle(ms = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
const input = (name: string) =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
const errorOf = (name: string) =>
  input(name)
    ?.closest('[data-slot="data-form-field"]')
    ?.querySelector('[data-slot="field-error"]')?.textContent ?? null;
const type = async (name: string, value: string) => {
  const element = input(name);
  assert.ok(element, `input ${name}`);
  await act(async () => {
    fireEvent.change(element, { target: { value } });
    fireEvent.blur(element);
  });
};
const submit = async () => {
  const form = document.querySelector("form");
  assert.ok(form);
  await act(async () => {
    fireEvent.submit(form);
  });
  await settle(10);
};

let latest: Instance | undefined;
function Capture({ form }: { form: Instance }) {
  latest = form;
  return null;
}
const latestValue = (name: string) =>
  (latest?.api.state.values as Record<string, unknown> | undefined)?.[name];

scenario("required fields block submit and show the message under the field");
{
  const sent: unknown[] = [];
  function Probe() {
    const form = ui.useDataForm({
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email" },
      ],
      onFinish: (values) => {
        sent.push(values);
      },
    });
    return (
      <>
        <Capture form={form as unknown as Instance} />
        <ui.DataForm form={form} />
      </>
    );
  }
  await act(async () => root.render(<Probe />));
  await submit();
  assert.equal(sent.length, 0);
  assert.equal(errorOf("name"), "Fill in this field.");
  assert.equal(input("name")?.getAttribute("aria-invalid"), "true");
  assert.equal(input("name")?.getAttribute("aria-required"), "true");
  assert.match(
    input("name")?.getAttribute("aria-describedby") ?? "",
    /-error$/,
  );
  await type("name", "Ada");
  assert.equal(errorOf("name"), null, "Blur validates again");
  await submit();
  assert.deepEqual(sent, [{ name: "Ada" }]);
}

scenario("JSON reactions show, require and clear a field");
{
  const sent: Record<string, unknown>[] = [];
  const fields: Field[] = [
    { name: "type", label: "Type" },
    {
      name: "company",
      label: "Company",
      reactions: [
        {
          when: {
            logic: "and",
            rules: [{ field: "type", operator: "eq", value: "enterprise" }],
          },
          fulfill: { hidden: false, required: true },
          otherwise: { hidden: true, value: null },
        },
      ],
    },
  ];
  function Probe() {
    const form = ui.useDataForm({
      fields,
      defaultValues: { type: "personal", company: "Kept" },
      onFinish: (values) => {
        sent.push(values);
      },
    });
    return (
      <>
        <Capture form={form as unknown as Instance} />
        <ui.DataForm form={form} />
      </>
    );
  }
  await act(async () => root.render(<Probe key="reactions" />));
  assert.equal(input("company"), null, "Hidden while personal");
  await type("type", "enterprise");
  await settle();
  assert.ok(input("company"), "Shown for enterprise");
  assert.equal(input("company")?.value, "Kept", "Hiding keeps the value");
  await type("company", "");
  await submit();
  assert.equal(sent.length, 0, "Required once shown");
  assert.equal(errorOf("company"), "Fill in this field.");
  await type("company", "Acme");
  await submit();
  assert.deepEqual(sent.at(-1), { type: "enterprise", company: "Acme" });
  await type("type", "personal");
  await settle();
  assert.equal(
    latestValue("company"),
    null,
    "Switching to otherwise wrote null",
  );
  await submit();
  assert.deepEqual(sent.at(-1), { type: "personal" }, "Hidden is not sent");
}

scenario("a change renders only the fields that depend on it");
{
  const renders = new Map<string, number>();
  const counted =
    (name: string) =>
    (props: {
      value: unknown;
      onChange: (v: unknown) => void;
      id: string;
      name: string;
    }) => {
      renders.set(name, (renders.get(name) ?? 0) + 1);
      return (
        <Input
          id={props.id}
          name={props.name}
          value={String(props.value ?? "")}
          onChange={(event) => props.onChange(event.target.value)}
        />
      );
    };
  const fields: Field[] = Array.from({ length: 200 }, (_, index) => {
    const name = `f${index}`;
    if (index > 0 && index <= 50)
      return {
        name,
        render: counted(name),
        reactions: [
          {
            when: {
              logic: "and",
              rules: [{ field: "f0", operator: "eq", value: "x" }],
            },
            fulfill: { disabled: true },
          },
        ],
      };
    return { name, render: counted(name) };
  });
  const started = performance.now();
  await act(async () =>
    root.render(<ui.DataForm key="bench" fields={fields} />),
  );
  const mounted = performance.now() - started;
  renders.clear();
  const typed = performance.now();
  await act(async () => {
    const element = input("f0");
    assert.ok(element);
    fireEvent.change(element, { target: { value: "x" } });
  });
  const changed = performance.now() - typed;
  assert.equal(renders.get("f0") ?? 0, 1, "The edited field renders once");
  for (let index = 1; index <= 50; index += 1)
    assert.ok((renders.get(`f${index}`) ?? 0) >= 1, `f${index} depends on f0`);
  for (let index = 51; index < 200; index += 1)
    assert.equal(renders.get(`f${index}`) ?? 0, 0, `f${index} stays put`);
  console.log(
    `200 fields: mount ${mounted.toFixed(0)}ms, one change ${changed.toFixed(0)}ms`,
  );
}

scenario("server errors land under their fields and clear on edit");
{
  await act(async () =>
    root.render(
      <ui.DataForm
        key="server"
        fields={[{ name: "email", label: "Email" }]}
        onFinish={() => ({
          fields: { email: "Already taken." },
          form: "Check the form.",
        })}
      />,
    ),
  );
  await type("email", "a@b.c");
  await submit();
  assert.equal(errorOf("email"), "Already taken.");
  assert.ok(
    document
      .querySelector('[data-slot="data-form-error-summary"]')
      ?.textContent?.includes("Check the form."),
  );
  await type("email", "c@d.e");
  assert.equal(errorOf("email"), null);
}

scenario("DataFormItem binds any control and lists add and remove rows");
{
  const sent: Record<string, unknown>[] = [];
  await act(async () =>
    root.render(
      <ui.DataForm
        key="item"
        defaultValues={{ members: [{ name: "Ada" }] }}
        onFinish={(values) => {
          sent.push(values);
        }}
      >
        <ui.DataFormItem name="title" label="Title" required>
          <Input />
        </ui.DataFormItem>
        <ui.DataFormList
          name="members"
          label="Members"
          fields={[{ name: "name", label: "Name", required: true }]}
        />
      </ui.DataForm>,
    ),
  );
  await type("title", "Team");
  const add = document.querySelector<HTMLButtonElement>(
    '[data-slot="data-form-list-add"]',
  );
  assert.ok(add);
  await act(async () => fireEvent.click(add));
  await waitFor(() => assert.ok(input("members[1].name"), "A row was added"));
  await submit();
  assert.equal(sent.length, 0, "The new row is required");
  await type("members[1].name", "Grace");
  await submit();
  assert.deepEqual(sent.at(-1), {
    title: "Team",
    members: [{ name: "Ada" }, { name: "Grace" }],
  });
}

scenario("steps validate one step at a time and submit everything");
{
  const sent: Record<string, unknown>[] = [];
  const plugins = [
    ui.steps({
      items: [
        { key: "account", title: "Account" },
        { key: "profile", title: "Profile" },
      ],
    }),
  ];
  await act(async () =>
    root.render(
      <ui.DataForm
        key="steps"
        plugins={plugins}
        fields={[
          { name: "email", label: "Email", required: true, step: "account" },
          { name: "bio", label: "Bio", required: true, step: "profile" },
        ]}
        onFinish={(values) => {
          sent.push(values);
        }}
      />,
    ),
  );
  const bio = () =>
    input("bio")?.closest<HTMLElement>('[data-slot="data-form-field"]');
  assert.equal(bio()?.hidden, true, "Later steps stay mounted out of view");
  await submit();
  assert.equal(errorOf("email"), "Fill in this field.");
  assert.equal(errorOf("bio"), null, "Only the current step is validated");
  await type("email", "a@b.c");
  await submit();
  assert.equal(bio()?.hidden, false, "Moved to the next step");
  await type("bio", "Hi");
  await submit();
  assert.deepEqual(sent, [{ email: "a@b.c", bio: "Hi" }]);
}

scenario("a field turns read-only and back without losing its control");
{
  const fields: Field[] = [
    {
      name: "plans",
      label: "Plans",
      valueType: "multiSelect",
      valueEnum: { a: "A", b: "B" },
    },
  ];
  const view = (readonly: boolean) =>
    root.render(
      <ui.DataForm
        key="toggle"
        readonly={readonly}
        fields={fields}
        defaultValues={{ plans: ["a"] }}
      />,
    );
  await act(async () => view(false));
  await act(async () => view(true));
  assert.ok(
    document
      .querySelector('[data-slot="data-form-value"]')
      ?.textContent?.includes("A"),
    "The read view replaces the control",
  );
  await act(async () => view(false));
  assert.equal(document.querySelector('[data-slot="data-form-value"]'), null);
}

scenario("light rows honor lightMode and grids animate their collapse");
{
  await act(async () =>
    root.render(
      <ui.DataForm
        key="light-modes"
        layout="light"
        fields={[
          { name: "q", label: "Keyword", lightMode: "inline" },
          { name: "tag", label: "Tag" },
          { name: "owner", label: "Owner", lightMode: "more" },
        ]}
      />,
    ),
  );
  const row = document.querySelector('[data-slot="data-form-fields"]');
  const inline = row?.querySelector('[data-mode="inline"]');
  assert.ok(inline?.textContent?.includes("Keyword"), "Inline keeps its label");
  assert.ok(
    inline?.querySelector('input[name="q"]'),
    "The control is on the row",
  );
  assert.ok(
    [...(row?.querySelectorAll("button") ?? [])].some((button) =>
      button.textContent?.includes("Tag"),
    ),
    "Popover fields are a button",
  );
  assert.ok(
    row?.querySelector('[data-slot="data-form-more-filters"]'),
    "More fields wait in Filters",
  );
  assert.ok(!row?.textContent?.includes("Owner"));

  await act(async () =>
    root.render(
      <ui.DataForm
        key="collapse"
        layout="grid"
        collapse={{ count: 1 }}
        fields={[
          { name: "a", label: "A" },
          { name: "b", label: "B" },
        ]}
      />,
    ),
  );
  assert.ok(document.querySelector('[data-slot="data-form-collapse-frame"]'));
  const fieldB = () =>
    input("b")?.closest<HTMLElement>('[data-slot="data-form-field"]');
  assert.ok(fieldB()?.className.includes("hidden"), "Collapsed but mounted");
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-slot="data-form-collapse"]',
  );
  assert.ok(toggle);
  await act(async () => fireEvent.click(toggle));
  await settle();
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.ok(fieldB()?.className.includes("animate-in"), "Fades in on expand");
  assert.ok(!fieldB()?.className.split(" ").includes("hidden"));
}

scenario("clearOnChange clears on edits, not when values load together");
{
  const fields: Field[] = [
    { name: "province", label: "Province" },
    {
      name: "city",
      label: "City",
      dependencies: ["province"],
      clearOnChange: true,
    },
    {
      name: "district",
      label: "District",
      dependencies: ["city"],
      clearOnChange: true,
    },
  ];
  function Probe() {
    const form = ui.useDataForm({
      fields,
      request: async () => ({ province: "zj", city: "hz", district: "xh" }),
    });
    return (
      <>
        <Capture form={form as unknown as Instance} />
        <ui.DataForm form={form} />
      </>
    );
  }
  await act(async () => root.render(<Probe key="clear" />));
  await waitFor(() => assert.equal(input("city")?.value, "hz"));
  assert.equal(latestValue("district"), "xh", "A loaded pair stays");
  await act(async () =>
    latest?.reset({ province: "js", city: "nj", district: "gl" }),
  );
  await settle();
  assert.equal(latestValue("city"), "nj", "So does a reset");
  await type("province", "sh");
  assert.equal(latestValue("city"), undefined, "An edit clears the city");
  assert.equal(latestValue("district"), undefined, "and what follows it");
}

scenario("validate() runs the form validator as a submit does");
{
  function Probe() {
    const form = ui.useDataForm({
      fields: [{ name: "code", label: "Code" }],
      validator: (values) =>
        String(values.code ?? "").length >= 4
          ? undefined
          : { fields: { code: "Too short." } },
    });
    return (
      <>
        <Capture form={form as unknown as Instance} />
        <ui.DataForm form={form} />
      </>
    );
  }
  await act(async () => root.render(<Probe key="validate" />));
  await type("code", "ab");
  let valid: boolean | undefined;
  await act(async () => {
    valid = await latest?.validate();
  });
  assert.equal(valid, false);
  assert.equal(errorOf("code"), "Too short.");
  await type("code", "abcd");
  await act(async () => {
    valid = await latest?.validate();
  });
  assert.equal(valid, true);
}

scenario("steps keep their buttons in a dialog, with Cancel, in any order");
{
  const items = [
    { key: "a", title: "First" },
    { key: "b", title: "Second" },
  ];
  const fields: Field[] = [
    { name: "x", label: "X", step: "a" },
    { name: "y", label: "Y", step: "b" },
  ];
  const footerText = () =>
    [...document.querySelectorAll('[data-slot="data-form-footer"] button')].map(
      (button) => button.textContent,
    );
  for (const plugins of [
    [ui.steps({ items }), ui.dialog({ title: "New", defaultOpen: true })],
    [ui.dialog({ title: "New", defaultOpen: true }), ui.steps({ items })],
  ]) {
    await act(async () =>
      root.render(
        <ui.DataForm
          key={plugins[0]?.name}
          plugins={plugins}
          fields={fields}
        />,
      ),
    );
    await waitFor(() => assert.deepEqual(footerText(), ["Cancel", "Next"]));
    assert.ok(
      document
        .querySelector('[data-slot="data-form-fields"]')
        ?.className.includes("overflow-y-auto"),
      "The fields scroll inside the dialog",
    );
  }
}

scenario("a draft is not saved again after a submit");
{
  window.localStorage.clear();
  const plugins = [ui.persistDraft({ key: "draft-test" })];
  await act(async () =>
    root.render(
      <ui.DataForm
        key="draft"
        plugins={plugins}
        fields={[{ name: "title", label: "Title" }]}
        onFinish={() => undefined}
      />,
    ),
  );
  await type("title", "Hello");
  await submit();
  // Past the save delay: the save waiting from the edit must not run.
  await settle(600);
  assert.equal(window.localStorage.getItem("draft-test"), null);
  await type("title", "Hello again");
  await waitFor(() =>
    assert.ok(window.localStorage.getItem("draft-test"), "Edits save again"),
  );
}

await act(async () => root.unmount());
await window.happyDOM.abort();
