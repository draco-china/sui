import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";

export default function KbdButton() {
  return (
    <Button variant="outline">
      Accept{" "}
      <Kbd data-icon="inline-end" className="translate-x-0.5">
        ⏎
      </Kbd>
    </Button>
  );
}
