import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { formatDateOnly, formatDateTime, formatMoney } from "@/lib/utils";
import type { Payment } from "@/types/api";
import { useCancelPayment, useMarkPaid } from "../api";
import { PaymentStatusBadge } from "./status";

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
export const refMonth = (ref: string) => monthFmt.format(new Date(`${ref}-01T00:00:00Z`));

export function PaymentRow({ payment, title }: { payment: Payment; title?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState("PIX");
  const [notes, setNotes] = React.useState("");
  const pay = useMarkPaid();
  const cancel = useCancelPayment();
  const open_ = payment.status === "PENDING" || payment.status === "OVERDUE";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        {title && <div className="truncate font-medium">{title}</div>}
        <p className="text-sm capitalize">
          <span className={title ? "text-zinc-500" : "font-medium"}>{refMonth(payment.referenceMonth)}</span>
          <span className="text-zinc-400"> · vence {formatDateOnly(payment.dueDate)}</span>
        </p>
        {payment.paidAt && (
          <p className="text-xs text-zinc-500">
            Pago em {formatDateTime(payment.paidAt)} {payment.method && `via ${payment.method}`}
          </p>
        )}
      </div>
      <span className="font-semibold tabular-nums">{formatMoney(payment.amountCents)}</span>
      <PaymentStatusBadge status={payment.status} />
      {open_ && (
        <div className="flex w-full gap-2 sm:w-auto">
          <Button size="sm" variant="success" className="flex-1 sm:flex-none" onClick={() => setOpen(true)}>
            <Check /> Dar baixa
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={cancel.isPending}
            onClick={() => confirm("Abonar esta cobrança? Ela deixa de contar como dívida.") && cancel.mutate(payment.id)}
          >
            Abonar
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pagamento"
        description={`${formatMoney(payment.amountCents)} · referência ${refMonth(payment.referenceMonth)}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button
              variant="success"
              loading={pay.isPending}
              className="flex-1 sm:flex-none"
              onClick={() => pay.mutate({ id: payment.id, method, notes }, { onSuccess: () => setOpen(false) })}
            >
              Confirmar pagamento
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Forma de pagamento">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {["PIX", "Boleto", "Cartão", "Dinheiro", "Transferência"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Observação (opcional)">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <p className="text-xs text-zinc-500">Se a barbearia estiver suspensa por atraso e não houver outras pendências, ela é reativada automaticamente.</p>
        </div>
      </Dialog>
    </div>
  );
}
