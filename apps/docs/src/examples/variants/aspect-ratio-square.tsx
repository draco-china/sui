import { AspectRatio } from "@workspace/ui/components/aspect-ratio";

export function AspectRatioSquare() {
  return (
    <AspectRatio ratio={1 / 1} className="w-full max-w-48 rounded-lg bg-muted">
      <img
        src="https://avatar.vercel.sh/shadcn1"
        alt="Landscape"
        className="rounded-lg object-cover grayscale dark:brightness-20"
      />
    </AspectRatio>
  );
}

export default AspectRatioSquare;
