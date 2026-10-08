import { Toggle } from "@workspace/ui/components/toggle";
import { ItalicIcon } from "lucide-react";

export function ToggleText() {
  return (
    <Toggle aria-label="Toggle italic">
      <ItalicIcon />
      Italic
    </Toggle>
  );
}

export default ToggleText;
