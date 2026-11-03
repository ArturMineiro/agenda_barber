import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * No celular abre como "bottom sheet" (de baixo pra cima, ocupa a largura);
 * no desktop vira um modal centralizado.
 */
export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl animate-sheet sm:max-w-lg sm:rounded-2xl sm:animate-in",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-zinc-200 sm:hidden" />
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:pt-5">
            <div>
              {title && <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-zinc-100 px-5 py-3 pb-safe sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
