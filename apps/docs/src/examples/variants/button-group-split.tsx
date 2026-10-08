import { Button } from "@workspace/ui/components/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@workspace/ui/components/button-group";
import { PlusIcon } from "lucide-react";

export default function ButtonGroupSplit() {
  return (
    <ButtonGroup>
      <Button variant="secondary">Button</Button>
      <ButtonGroupSeparator />
      <Button size="icon" variant="secondary">
        <PlusIcon />
      </Button>
    </ButtonGroup>
  );
}
