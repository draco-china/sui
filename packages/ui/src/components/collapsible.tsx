import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { withGlass } from "../lib/glass/context";

function CollapsibleImplementation({
  ...props
}: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  );
}

const Collapsible = withGlass(CollapsibleImplementation, "scope");

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
