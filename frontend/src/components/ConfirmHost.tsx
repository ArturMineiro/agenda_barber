import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";

/**
 * Confirmações e perguntas com o modal do próprio sistema (nada de confirm()/prompt() do navegador).
 *
 *   if (await confirmar({ title: "Remover foto?", danger: true })) remove()
 *   const motivo = await perguntar({ title: "Suspender", label: "Motivo" })  // null = cancelou
 *
 * O <ConfirmHost /> fica montado uma vez na raiz do app.
 */

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** botão vermelho (ação destrutiva) */
  danger?: boolean;
}

interface AskOptions extends ConfirmOptions {
  label?: string;
  placeholder?: string;
  /** pode confirmar em branco */
  optional?: boolean;
  /** sugestões em um toque */
  suggestions?: string[];
}

type Request =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "ask"; opts: AskOptions; resolve: (v: string | null) => void };

let push: ((r: Request) => void) | null = null;

export function confirmar(opts: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    if (!push) return resolve(false);
    push({ kind: "confirm", opts, resolve });
  });
}

/** Devolve o texto digitado ("" se em branco e opcional) ou null se cancelou */
export function perguntar(opts: AskOptions) {
  return new Promise<string | null>((resolve) => {
    if (!push) return resolve(null);
    push({ kind: "ask", opts, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = React.useState<Request | null>(null);
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    push = (r) => {
      setText("");
      setReq(r);
    };
    return () => {
      push = null;
    };
  }, []);

  const close = React.useCallback(() => {
    setReq((r) => {
      if (r?.kind === "confirm") r.resolve(false);
      else r?.resolve(null);
      return null;
    });
  }, []);

  if (!req) return null;
  const { opts } = req;
  const ask = req.kind === "ask" ? (opts as AskOptions) : null;
  const blocked = !!ask && !ask.optional && !text.trim();

  const ok = () => {
    if (blocked) return;
    if (req.kind === "confirm") req.resolve(true);
    else req.resolve(text.trim());
    setReq(null);
  };

  return (
    <Dialog
      open
      onClose={close}
      title={opts.title}
      description={opts.description}
      footer={
        <>
          <Button variant="outline" onClick={close} className="flex-1 sm:flex-none">
            {opts.cancelLabel ?? "Cancelar"}
          </Button>
          <Button variant={opts.danger ? "danger" : "default"} onClick={ok} disabled={blocked} className="flex-1 sm:flex-none" autoFocus={!ask}>
            {opts.confirmLabel ?? "Confirmar"}
          </Button>
        </>
      }
    >
      {ask ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ok();
          }}
        >
          <Field label={ask.label}>
            {ask.suggestions?.length ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {ask.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setText(s)}
                    className={
                      text === s
                        ? "rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white ring-1 ring-zinc-900"
                        : "rounded-full px-3 py-1.5 text-xs ring-1 ring-zinc-200 hover:ring-zinc-400"
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <Textarea autoFocus rows={2} className="min-h-0" value={text} placeholder={ask.placeholder} onChange={(e) => setText(e.target.value)} />
          </Field>
        </form>
      ) : (
        // sem texto extra: o título já diz tudo; o corpo fica vazio
        <span className="sr-only">{opts.title}</span>
      )}
    </Dialog>
  );
}
