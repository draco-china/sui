import { Toggle } from "@workspace/ui/components/toggle";
import { BookmarkIcon } from "lucide-react";

export function ToggleDemo() {
  return (
    <Toggle aria-label="Toggle bookmark" size="sm" variant="outline">
      <BookmarkIcon className="group-aria-pressed/toggle:fill-current" />
      Bookmark
    </Toggle>
  );
}

export default ToggleDemo;
