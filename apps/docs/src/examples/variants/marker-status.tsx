import { Loader } from "@workspace/ui/components/loader";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@workspace/ui/components/marker";

export function MarkerStatusDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8 py-12">
      <Marker role="status">
        <MarkerIcon>
          <Loader size="sm" />
        </MarkerIcon>
        <MarkerContent>Compacting conversation</MarkerContent>
      </Marker>
      <Marker variant="separator" role="status">
        <MarkerIcon>
          <Loader size="sm" />
        </MarkerIcon>
        <MarkerContent>Running tests</MarkerContent>
      </Marker>
    </div>
  );
}

export default MarkerStatusDemo;
