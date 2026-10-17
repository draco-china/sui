import { describe, expect, test } from "bun:test";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { GlassSurface } from "@workspace/ui/components/glass";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Toggle } from "@workspace/ui/components/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { Window } from "happy-dom";
import { Fragment, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describeFixture } from "./support/fixture";

type ControlProps = { glass?: boolean; frosted?: boolean; disabled?: boolean };
const controls: {
  name: string;
  slots: string[];
  render: (props: ControlProps) => ReactNode;
}[] = [
  {
    name: "toggle",
    slots: ["toggle"],
    render: (props) => (
      <Toggle {...props} defaultPressed>
        Bold
      </Toggle>
    ),
  },
  {
    name: "toggle group item",
    slots: ["toggle-group-item"],
    render: ({ disabled, ...material }) => (
      <ToggleGroup defaultValue={["bold"]} disabled={disabled}>
        <ToggleGroupItem value="bold" {...material}>
          Bold
        </ToggleGroupItem>
      </ToggleGroup>
    ),
  },
];

function documentFor(content: ReactNode) {
  const window = new Window();
  window.document.body.innerHTML = renderToString(content);
  return window.document;
}

describe("small controls take the material they ask for", () => {
  for (const control of controls) {
    test(`${control.name} is Clear with glass and CSS-only when frosted`, () => {
      const clear = documentFor(control.render({ glass: true }));
      const frosted = documentFor(control.render({ frosted: true }));
      for (const slot of control.slots) {
        const glassElement = clear.querySelector(`[data-slot="${slot}"]`);
        expect(glassElement?.getAttribute("data-glass")).toBe("true");
        expect(glassElement?.getAttribute("data-glass-scope")).toBeTruthy();
        const frostedElement = frosted.querySelector(`[data-slot="${slot}"]`);
        expect(frostedElement?.getAttribute("data-frosted")).toBe("true");
        expect(frostedElement?.hasAttribute("data-glass")).toBe(false);
      }
      expect(clear.querySelector("canvas")).toBeNull();
    });
    test(`${control.name} stays ordinary without glass`, () => {
      const document = documentFor(control.render({}));
      expect(document.querySelector("[data-glass], [data-frosted]")).toBeNull();
      for (const slot of control.slots)
        expect(document.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    });
    test(`${control.name} preserves its disabled state in glass mode`, () => {
      const document = documentFor(
        control.render({ glass: true, disabled: true }),
      );
      expect(document.querySelector('[data-glass="true"]')).not.toBeNull();
      expect(
        document.querySelector("[disabled], [data-disabled]"),
      ).not.toBeNull();
    });
  }

  test("checked, pressed and native input semantics survive glass", () => {
    const document = documentFor(
      controls.map((control) => (
        <Fragment key={control.name}>
          {control.render({ glass: true })}
        </Fragment>
      )),
    );
    for (const slot of ["toggle", "toggle-group-item"])
      expect(
        document
          .querySelector(`[data-slot="${slot}"]`)
          ?.getAttribute("aria-pressed"),
      ).toBe("true");
  });

  test("group items choose their material independently", () => {
    const document = documentFor(
      <ToggleGroup>
        <ToggleGroupItem value="plain" data-case="plain-toggle">
          Plain
        </ToggleGroupItem>
        <ToggleGroupItem glass value="glass" data-case="glass-toggle">
          Glass
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(
      document
        .querySelector('[data-case="plain-toggle"][data-slot]')
        ?.hasAttribute("data-glass"),
    ).toBe(false);
    const item = document.querySelector(
      '[data-case="glass-toggle"][data-slot]',
    );
    expect(item?.getAttribute("data-glass")).toBe("true");
    expect(item?.getAttribute("data-glass-scope")).toBeTruthy();
  });

  test("custom rendering and caller attributes remain on the native control", () => {
    const document = documentFor(
      <Toggle
        glass
        render={<button type="button" />}
        id="custom"
        className="caller"
        aria-label="Custom"
        data-caller="kept"
        defaultPressed
      />,
    );
    const button = document.querySelector("#custom");
    expect(button?.tagName).toBe("BUTTON");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.classList.contains("caller")).toBe(true);
    expect(button?.getAttribute("aria-label")).toBe("Custom");
    expect(button?.getAttribute("data-caller")).toBe("kept");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.getAttribute("data-glass")).toBe("true");
  });
});

test("checkbox, radio and OTP stay ordinary content controls inside glass", () => {
  for (const surface of [false, true]) {
    const window = new Window();
    const content = (
      <>
        <Checkbox defaultChecked aria-label="Agree" />
        <RadioGroup defaultValue="one">
          <RadioGroupItem value="one" aria-label="One" />
        </RadioGroup>
        <InputOTP length={2} defaultValue="12">
          <InputOTPGroup>
            <InputOTPSlot aria-label="First digit" />
            <InputOTPSlot aria-label="Second digit" />
          </InputOTPGroup>
        </InputOTP>
      </>
    );
    window.document.body.innerHTML = renderToString(
      surface ? <GlassSurface>{content}</GlassSurface> : content,
    );
    const document = window.document;
    expect(document.querySelectorAll("[data-glass]").length).toBe(
      Number(surface),
    );
    for (const slot of ["checkbox", "radio-group-item"])
      expect(
        document
          .querySelector(`[data-slot="${slot}"]`)
          ?.hasAttribute("data-checked"),
      ).toBe(true);
    expect(
      [...document.querySelectorAll('[data-slot="input-otp-slot"]')].map(
        (input) => input.getAttribute("value"),
      ),
    ).toEqual(["1", "2"]);
  }
});

describeFixture(
  "Switch and Slider lift a Clear lens only while pressed or dragged",
  "glass-press-lens.tsx",
);
