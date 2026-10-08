import { BugReportForm } from "@workspace/ui/blocks/tanstack-form";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseBugReportFormLabels } from "./block-form-labels";

export default function ReportForm({ locale }: ExampleProps) {
  const [submitted, setSubmitted] = useState("");
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <BugReportForm
        labels={locale === "zh-CN" ? chineseBugReportFormLabels : undefined}
        onSubmit={async (values) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          setSubmitted(values.title);
        }}
      />
      {submitted && (
        <p className="text-muted-foreground text-sm" role="status">
          {submitted}
        </p>
      )}
    </div>
  );
}
