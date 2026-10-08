import { AspectRatio } from "@workspace/ui/components/aspect-ratio";

export function AspectRatioPortrait() {
  return (
    <AspectRatio
      ratio={9 / 16}
      className="w-full max-w-[10rem] rounded-lg bg-muted"
    >
      <img
        src="https://avatar.vercel.sh/shadcn1"
        alt="Landscape"
        className="rounded-lg object-cover grayscale dark:brightness-20"
      />
    </AspectRatio>
  );
}

export default AspectRatioPortrait;
