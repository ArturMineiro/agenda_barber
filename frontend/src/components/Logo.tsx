import { Scissors } from "lucide-react";
import { APP_NAME } from "@navalha/shared";
import { cn } from "@/lib/utils";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-zinc-900 text-amber-400 ring-1 ring-white/10">
        <Scissors className="size-4 -rotate-45" />
      </span>
      <span className={light ? "text-white" : "text-zinc-900"}>{APP_NAME}</span>
    </span>
  );
}
