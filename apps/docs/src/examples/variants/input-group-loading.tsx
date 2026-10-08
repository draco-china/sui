import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group";
import { Loader } from "@workspace/ui/components/loader";

export default function InputGroupLoading() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <InputGroup>
        <InputGroupInput placeholder="Searching..." />
        <InputGroupAddon align="inline-end">
          <Loader size="sm" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Processing..." />
        <InputGroupAddon>
          <Loader size="sm" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Saving changes..." />
        <InputGroupAddon align="inline-end">
          <InputGroupText>Saving...</InputGroupText>
          <Loader size="sm" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Refreshing data..." />
        <InputGroupAddon>
          <Loader size="sm" variant="dash-ring" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupText className="text-muted-foreground">
            Please wait...
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
