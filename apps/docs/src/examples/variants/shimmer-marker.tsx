import { Loader } from "@workspace/ui/components/loader";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@workspace/ui/components/marker";
import type { ExampleProps } from "../types";

export default function ShimmerMarker({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Marker role="status">
        <MarkerIcon>
          <Loader size="sm" label={chinese ? "正在思考" : "Thinking"} />
        </MarkerIcon>
        <MarkerContent className="shimmer">
          {chinese ? "正在思考…" : "Thinking…"}
        </MarkerContent>
      </Marker>
      <Marker variant="separator" role="status">
        <MarkerContent className="shimmer">
          {chinese ? "正在读取 4 个文件" : "Reading 4 files"}
        </MarkerContent>
      </Marker>
    </div>
  );
}
