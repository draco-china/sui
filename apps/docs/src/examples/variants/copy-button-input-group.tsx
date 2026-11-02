"use client";
import { CopyButton } from "@workspace/ui/components/copy-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { clipboardLabelsZhCN } from "@workspace/ui/hooks/use-clipboard";
import type { ExampleProps } from "../types";

const command = "bun add @workspace/ui";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <InputGroup className="w-full max-w-md font-mono">
      <InputGroupInput
        readOnly
        value={command}
        aria-label={zh ? "安装命令" : "Install command"}
      />
      <InputGroupAddon align="inline-end">
        <CopyButton
          value={command}
          render={<InputGroupButton size="icon-xs" />}
          labels={zh ? clipboardLabelsZhCN : undefined}
        />
      </InputGroupAddon>
    </InputGroup>
  );
}
