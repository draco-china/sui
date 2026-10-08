import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample() {
  return <h2 className="font-semibold text-lg">Recent requests</h2>;
}

function AvoidSample() {
  return (
    <div className="grid gap-4">
      <h2 className="font-semibold text-lg">Recent Requests</h2>
      <h2 className="font-semibold text-lg uppercase">Recent requests</h2>
    </div>
  );
}

export default function Example({ locale }: ExampleProps) {
  return (
    <DesignComparison
      locale={locale}
      recommended={<RecommendedSample />}
      avoid={<AvoidSample />}
    />
  );
}
