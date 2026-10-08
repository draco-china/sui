import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";

export function TextareaButton() {
  return (
    <div className="grid w-full gap-2">
      <Textarea placeholder="Type your message here." />
      <Button>Send message</Button>
    </div>
  );
}

export default TextareaButton;
