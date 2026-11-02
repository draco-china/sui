"use client";

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@workspace/ui/components/questionnaire";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/toast";
import * as React from "react";

const items = [
  {
    choices: [{ value: "inspect" }, { value: "tests" }, { value: "patch" }],
    name: "action",
    required: true,
  },
] as const;

type ShortcutMode = React.ComponentProps<typeof Questionnaire>["shortcuts"];

const shortcutOptions = [
  { value: "none", label: "No shortcuts" },
  { value: "letters", label: "Letters" },
  { value: "numbers", label: "Numbers" },
];

export function QuestionnaireShortcuts() {
  const [shortcuts, setShortcuts] = React.useState<ShortcutMode>("letters");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const action = new FormData(event.currentTarget).get("action");

    toast.add({
      title: "Next action selected",
      ...{
        description: `Action: ${action ?? "None"} · Shortcuts: ${shortcuts ?? "none"}`,
      },
    });
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-md flex-col">
      <Select
        items={shortcutOptions}
        value={shortcuts ?? "none"}
        onValueChange={(value) =>
          setShortcuts(
            value === "letters" || value === "numbers" ? value : undefined,
          )
        }
      >
        <SelectTrigger
          aria-label="Shortcut style"
          className="absolute inset-e-0 top-0 w-fit"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectList>
            {shortcutOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectList>
        </SelectContent>
      </Select>

      <Questionnaire
        className="mt-auto"
        items={items}
        shortcuts={shortcuts}
        onSubmit={handleSubmit}
      >
        <QuestionnaireItem name="action" required>
          <QuestionnaireTitle>
            What should the agent do next?
          </QuestionnaireTitle>
          <QuestionnaireDescription>
            Use the displayed shortcut or navigate with the keyboard.
          </QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="inspect">
              Inspect the implementation
            </QuestionnaireChoice>
            <QuestionnaireChoice value="tests">
              Run the relevant tests
            </QuestionnaireChoice>
            <QuestionnaireChoice value="patch">
              Prepare the patch
            </QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>

        <QuestionnaireActions>
          <QuestionnaireSubmit>Confirm action</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  );
}

export default QuestionnaireShortcuts;
