import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { withGlass } from "../lib/glass/context";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-3xl font-medium text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-primary/40 aria-pressed:bg-accent aria-pressed:text-accent-foreground aria-pressed:hover:bg-accent aria-pressed:hover:text-accent-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
      },
      size: {
        default:
          "h-9 min-w-9 px-3 has-data-[icon=inline-start]:ps-2.5 has-data-[icon=inline-end]:pe-2.5",
        sm: "h-8 min-w-8 px-3 has-data-[icon=inline-start]:ps-2 has-data-[icon=inline-end]:pe-2",
        lg: "h-10 min-w-10 px-4 has-data-[icon=inline-start]:ps-3 has-data-[icon=inline-end]:pe-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function ToggleImplementation({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

const Toggle = withGlass(ToggleImplementation, "control");

export { Toggle, toggleVariants };
