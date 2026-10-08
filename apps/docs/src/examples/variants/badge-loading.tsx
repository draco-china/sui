import { Badge } from "@workspace/ui/components/badge";
import { Loader } from "@workspace/ui/components/loader";

export function BadgeWithLoader() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="destructive">
        <Loader size="sm" data-icon="inline-start" />
        Deleting
      </Badge>
      <Badge variant="secondary">
        Generating
        <Loader size="sm" data-icon="inline-end" />
      </Badge>
    </div>
  );
}

export default BadgeWithLoader;
