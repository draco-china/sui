import { Badge } from "@workspace/ui/components/badge";
import { ArrowUpRightIcon } from "lucide-react";

export function BadgeAsLink() {
  return (
    <Badge render={<a href="#link" />}>
      Open Link <ArrowUpRightIcon data-icon="inline-end" />
    </Badge>
  );
}

export default BadgeAsLink;
