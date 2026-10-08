"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { MaximizeIcon, MinimizeIcon } from "lucide-react";
import * as React from "react";
import { useId as usePreviewId } from "react";

export function CollapsibleSettings() {
  const previewId = usePreviewId();

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Card className="mx-auto w-full max-w-xs" size="sm">
      <CardHeader>
        <CardTitle>Radius</CardTitle>
        <CardDescription>Set the corner radius of the element.</CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="flex items-start gap-2"
        >
          <FieldGroup className="grid w-full grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor={`${previewId}-radius-x`} className="sr-only">
                Radius X
              </FieldLabel>
              <Input
                id={`${previewId}-radius-x`}
                placeholder="0"
                defaultValue={0}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${previewId}-radius-y`} className="sr-only">
                Radius Y
              </FieldLabel>
              <Input
                id={`${previewId}-radius-y`}
                placeholder="0"
                defaultValue={0}
              />
            </Field>
            <CollapsibleContent className="col-span-full grid grid-cols-subgrid gap-2">
              <Field>
                <FieldLabel
                  htmlFor={`${previewId}-radius-expanded-x`}
                  className="sr-only"
                >
                  Radius X
                </FieldLabel>
                <Input
                  id={`${previewId}-radius-expanded-x`}
                  placeholder="0"
                  defaultValue={0}
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor={`${previewId}-radius-expanded-y`}
                  className="sr-only"
                >
                  Radius Y
                </FieldLabel>
                <Input
                  id={`${previewId}-radius-expanded-y`}
                  placeholder="0"
                  defaultValue={0}
                />
              </Field>
            </CollapsibleContent>
          </FieldGroup>
          <CollapsibleTrigger render={<Button variant="outline" size="icon" />}>
            {isOpen ? <MinimizeIcon /> : <MaximizeIcon />}
          </CollapsibleTrigger>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default CollapsibleSettings;
