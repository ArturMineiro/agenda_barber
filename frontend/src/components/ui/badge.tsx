import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-zinc-100 text-zinc-700",
      success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15",
      warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
      danger: "bg-red-50 text-red-700 ring-1 ring-red-600/15",
      info: "bg-sky-50 text-sky-700 ring-1 ring-sky-600/15",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
