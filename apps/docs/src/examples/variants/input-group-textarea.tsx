"use client";
import { CopyIcon } from "@workspace/ui/components/copy-icon";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { toast } from "@workspace/ui/components/toast";
import { useClipboard } from "@workspace/ui/hooks/use-clipboard";
import { CornerDownLeftIcon, FileCodeIcon, RefreshCwIcon } from "lucide-react";
import { useId, useState } from "react";

const initialCode = "console.log('Hello, world!');";

export default function InputGroupTextareaExample() {
  const sourceId = useId();
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState("");
  const { copy, status } = useClipboard(code, {
    onCopyError: () =>
      toast.add({
        title: "Copy failed",
        description: "Select the code and copy it manually.",
      }),
  });

  return (
    <div className="grid w-full max-w-md gap-4">
      <InputGroup>
        <InputGroupTextarea
          id={sourceId}
          aria-label="Script source"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-[200px]"
        />
        <InputGroupAddon align="block-start" className="border-b">
          <InputGroupText className="font-medium font-mono">
            <FileCodeIcon /> script.js
          </InputGroupText>
          <InputGroupButton
            className="ms-auto"
            size="icon-xs"
            aria-label="Reset code"
            onClick={() => {
              setCode(initialCode);
              setPreview("");
            }}
          >
            <RefreshCwIcon />
          </InputGroupButton>
          <InputGroupButton
            variant="ghost"
            size="icon-xs"
            aria-label={status === "copied" ? "Copied code" : "Copy code"}
            disabled={status === "pending"}
            onClick={() => copy()}
          >
            <CopyIcon status={status} />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupAddon align="block-end" className="border-t">
          <InputGroupText>{code.split("\n").length} lines</InputGroupText>
          <InputGroupButton
            size="sm"
            className="ms-auto"
            variant="default"
            onClick={() => setPreview(code)}
            disabled={!code.trim()}
          >
            Preview <CornerDownLeftIcon data-icon="inline-end" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {preview && (
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-sm">
          <code>{preview}</code>
        </pre>
      )}
    </div>
  );
}
