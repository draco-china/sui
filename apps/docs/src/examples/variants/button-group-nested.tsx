import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { AudioLinesIcon, PlusIcon } from "lucide-react";

export function ButtonGroupNested() {
  return (
    <ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="icon">
          <PlusIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <InputGroup>
          <InputGroupInput placeholder="Send a message..." />
          <Tooltip>
            <TooltipTrigger render={<InputGroupAddon align="inline-end" />}>
              <AudioLinesIcon />
            </TooltipTrigger>
            <TooltipContent>Voice Mode</TooltipContent>
          </Tooltip>
        </InputGroup>
      </ButtonGroup>
    </ButtonGroup>
  );
}

export default ButtonGroupNested;
