import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { MinusIcon, PlusIcon } from "lucide-react";

export default function ButtonGroupOrientation() {
  return (
    <ButtonGroup
      orientation="vertical"
      aria-label="Media controls"
      className="h-fit"
    >
      <Button variant="outline" size="icon">
        <PlusIcon />
      </Button>
      <Button variant="outline" size="icon">
        <MinusIcon />
      </Button>
    </ButtonGroup>
  );
}
