import { CommandBasic } from "../examples/variants/command-basic";
import { CommandDemo } from "../examples/variants/command-demo";

export default function GlassCommandCase() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <CommandDemo />
      <CommandBasic />
    </div>
  );
}
