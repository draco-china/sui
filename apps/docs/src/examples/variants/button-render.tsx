import { buttonVariants } from "@workspace/ui/components/button";

export default function ButtonRender() {
  return (
    <a
      href="/docs"
      className={buttonVariants({ variant: "secondary", size: "sm" })}
    >
      Login
    </a>
  );
}
