import { describe, expect, test } from "bun:test";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import { Toggle } from "@workspace/ui/components/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { Window } from "happy-dom";
import { Fragment, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { GlassContext } from "../../../packages/ui/src/lib/glass/context";

type ControlProps = { glass?: boolean; disabled?: boolean };
const controls: {
  name: string;
  slots: string[];
  render: (props: ControlProps) => ReactNode;
}[] = [
  {
    name: "checkbox",
    slots: ["checkbox"],
    render: (props) => (
      <Checkbox {...props} defaultChecked aria-label="Agree" />
    ),
  },
  {
    name: "radio",
    slots: ["radio-group-item"],
    render: ({ glass, disabled }) => (
      <RadioGroup glass={glass} defaultValue="one" disabled={disabled}>
        <RadioGroupItem value="one" aria-label="One" />
      </RadioGroup>
    ),
  },
  {
    name: "switch",
    slots: ["switch"],
    render: (props) => (
      <Switch {...props} defaultChecked aria-label="Enabled" />
    ),
  },
  {
    name: "range slider",
    slots: ["slider-track", "slider-thumb"],
    render: (props) => (
      <Slider {...props} defaultValue={[20, 80]} aria-label="Range" />
    ),
  },
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
    name: "toggle group",
    slots: ["toggle-group-item"],
    render: ({ glass, disabled }) => (
      <ToggleGroup glass={glass} defaultValue={["bold"]} disabled={disabled}>
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      </ToggleGroup>
    ),
  },
  {
    name: "OTP",
    slots: ["input-otp-slot"],
    render: ({ glass, disabled }) => (
      <InputOTP glass={glass} length={2} disabled={disabled} defaultValue="12">
        <InputOTPGroup>
          <InputOTPSlot aria-label="First digit" />
          <InputOTPSlot aria-label="Second digit" />
        </InputOTPGroup>
      </InputOTP>
    ),
  },
];

function documentFor(content: ReactNode, inherited = false) {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassContext.Provider
      value={{
        enabled: inherited,
        surface: false,
        configuration: { mode: "auto", material: "clear" },
      }}
    >
      {content}
    </GlassContext.Provider>,
  );
  return window.document;
}

describe("small glass controls use fixed Regular CSS", () => {
  for (const control of controls) {
    test(`${control.name} keeps fixed material with explicit or inherited glass`, () => {
      for (const inherited of [false, true]) {
        const document = documentFor(
          control.render({ glass: inherited ? undefined : true }),
          inherited,
        );
        const surfaces = document.querySelectorAll('[data-glass="true"]');
        expect(surfaces.length).toBeGreaterThan(0);
        expect(
          new Set(
            [...surfaces].map((surface) =>
              surface.getAttribute("data-glass-scope"),
            ),
          ).size,
        ).toBe(surfaces.length);
        for (const slot of control.slots) {
          const elements = document.querySelectorAll(`[data-slot="${slot}"]`);
          expect(elements.length).toBeGreaterThan(0);
          for (const element of elements) {
            expect(element.getAttribute("data-glass")).toBe("true");
            expect(element.getAttribute("data-glass-material")).toBe("regular");
            expect(element.getAttribute("data-glass-scope")).toBeTruthy();
            expect(element.getAttribute("data-glass-scope")).not.toBe(
              "ambient",
            );
          }
        }
        expect(document.querySelector("canvas")).toBeNull();
      }
    });
    test(`${control.name} keeps ordinary and explicit opt-out controls plain`, () => {
      for (const inherited of [false, true]) {
        const document = documentFor(
          control.render({ glass: inherited ? false : undefined }),
          inherited,
        );
        expect(document.querySelector("[data-glass]")).toBeNull();
        for (const slot of control.slots)
          expect(
            document.querySelector(`[data-slot="${slot}"]`),
          ).not.toBeNull();
      }
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

  test("checked, pressed and native input semantics survive material overrides", () => {
    const document = documentFor(
      controls.map((control) => (
        <Fragment key={control.name}>
          {control.render({ glass: true })}
        </Fragment>
      )),
    );
    for (const slot of ["checkbox", "radio-group-item", "switch"])
      expect(
        document
          .querySelector(`[data-slot="${slot}"]`)
          ?.hasAttribute("data-checked"),
      ).toBe(true);
    for (const slot of ["toggle", "toggle-group-item"])
      expect(
        document
          .querySelector(`[data-slot="${slot}"]`)
          ?.getAttribute("aria-pressed"),
      ).toBe("true");
    expect(
      document.querySelectorAll(
        '[data-slot="slider-thumb"] input[type="range"]',
      ).length,
    ).toBe(2);
    expect(
      [...document.querySelectorAll('[data-slot="input-otp-slot"]')].map(
        (input) => input.getAttribute("value"),
      ),
    ).toEqual(["1", "2"]);
  });

  test("group items can explicitly opt in or opt out independently of the group", () => {
    const document = documentFor(
      <>
        <RadioGroup glass defaultValue="plain">
          <RadioGroupItem glass={false} value="plain" data-case="plain-radio" />
          <RadioGroupItem glass value="glass" data-case="glass-radio" />
        </RadioGroup>
        <ToggleGroup glass>
          <ToggleGroupItem glass={false} value="plain" data-case="plain-toggle">
            Plain
          </ToggleGroupItem>
          <ToggleGroupItem glass value="glass" data-case="glass-toggle">
            Glass
          </ToggleGroupItem>
        </ToggleGroup>
        <InputOTP glass length={2}>
          <InputOTPSlot glass={false} data-case="plain-otp" />
          <InputOTPSlot glass data-case="glass-otp" />
        </InputOTP>
      </>,
    );
    for (const kind of ["radio", "toggle", "otp"]) {
      expect(
        document
          .querySelector(`[data-case="plain-${kind}"][data-slot]`)
          ?.hasAttribute("data-glass"),
      ).toBe(false);
      expect(
        document
          .querySelector(`[data-case="glass-${kind}"][data-slot]`)
          ?.getAttribute("data-glass-material"),
      ).toBe("regular");
      expect(
        document
          .querySelector(`[data-case="glass-${kind}"][data-slot]`)
          ?.getAttribute("data-glass-scope"),
      ).toBeTruthy();
    }
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
    expect(button?.getAttribute("data-glass-material")).toBe("regular");
  });
});
