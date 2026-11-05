import { useState } from "react";

export const wait = (ms = 600) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Shows the last submitted payload under a demo form. */
export function useSubmitted(zh: boolean) {
  const [values, setValues] = useState<unknown>();
  const view =
    values === undefined ? null : (
      <div className="flex flex-col gap-1.5">
        <p className="font-medium text-sm">{zh ? "已提交" : "Submitted"}</p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-3 font-mono text-xs">
          {JSON.stringify(values, null, 2)}
        </pre>
      </div>
    );
  return [view, setValues] as const;
}

/** Picks the English or Chinese copy of a demo string. */
export const text = (zh: boolean) => (en: string, cn: string) => (zh ? cn : en);
