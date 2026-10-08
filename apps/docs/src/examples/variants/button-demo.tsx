import { Button } from "@workspace/ui/components/button";
import { ArrowUpIcon } from "lucide-react";

export default function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline">Button</Button>
      <Button variant="outline" size="icon" aria-label="Submit">
        <ArrowUpIcon />
      </Button>
    </div>
  );
}
