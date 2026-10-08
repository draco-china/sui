import { Button } from "@workspace/ui/components/button";
import { Field } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

export function InputInline() {
  return (
    <Field orientation="horizontal">
      <Input type="search" placeholder="Search..." />
      <Button>Search</Button>
    </Field>
  );
}

export default InputInline;
