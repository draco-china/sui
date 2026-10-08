import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useId as usePreviewId } from "react";

export function InputForm() {
  const previewId = usePreviewId();

  const countries = [
    { label: "United States", value: "us" },
    { label: "United Kingdom", value: "uk" },
    { label: "Canada", value: "ca" },
  ];
  return (
    <form className="w-full max-w-sm">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${previewId}-form-name`}>Name</FieldLabel>
          <Input
            id={`${previewId}-form-name`}
            type="text"
            placeholder="Evil Rabbit"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${previewId}-form-email`}>Email</FieldLabel>
          <Input
            id={`${previewId}-form-email`}
            type="email"
            placeholder="john@example.com"
          />
          <FieldDescription>
            We&apos;ll never share your email with anyone.
          </FieldDescription>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor={`${previewId}-form-phone`}>Phone</FieldLabel>
            <Input
              id={`${previewId}-form-phone`}
              type="tel"
              placeholder="+1 (555) 123-4567"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${previewId}-form-country`}>
              Country
            </FieldLabel>
            <Select items={countries} defaultValue="us">
              <SelectTrigger id={`${previewId}-form-country`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`${previewId}-form-address`}>Address</FieldLabel>
          <Input
            id={`${previewId}-form-address`}
            type="text"
            placeholder="123 Main St"
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">Submit</Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export default InputForm;
