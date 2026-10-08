import { Button } from "@workspace/ui/components/button";
import { ArrowUpIcon } from "lucide-react";

export default function ButtonRounded() {
  return (
    <div className="flex gap-2">
      <Button className="rounded-full">Get Started</Button>
      <Button variant="outline" className="rounded-lg">
        Soft corners
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        aria-label="Submit"
      >
        <ArrowUpIcon />
      </Button>
    </div>
  );
}
