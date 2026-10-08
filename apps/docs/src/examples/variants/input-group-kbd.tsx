import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Kbd } from "@workspace/ui/components/kbd";
import { SearchIcon } from "lucide-react";

export function InputGroupKbd() {
  return (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon>
        <SearchIcon className="text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}

export default InputGroupKbd;
