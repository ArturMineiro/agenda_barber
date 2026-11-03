import * as React from "react";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";
import type { PaymentStatus } from "@navalha/shared";
import { EmptyState, PageHeader, Skeleton, Tabs } from "@/components/ui/misc";
import { formatMoney } from "@/lib/utils";
import { useAdminPayments, useAdminStats } from "../api";
import { PaymentRow } from "../components/PaymentRow";

export function AdminPaymentsPage() {
  const [status, setStatus] = React.useState<PaymentStatus>("OVERDUE");
  const { data, isLoading } = useAdminPayments(status);
  const { data: stats } = useAdminStats();
  const total = data?.reduce((s, p) => s + p.amountCents, 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Mensalidades" description="Dê baixa nos pagamentos recebidos. Atrasos suspendem a barbearia automaticamente." />
      <Tabs<PaymentStatus>
        value={status}
        onChange={setStatus}
        items={[
          { value: "OVERDUE", label: "Atrasadas", count: stats?.overdueCount },
          { value: "PENDING", label: "Em aberto" },
          { value: "PAID", label: "Pagas" },
          { value: "CANCELED", label: "Abonadas" },
        ]}
      />

      {data && data.length > 0 && (
        <p className="text-sm text-zinc-500">
          {data.length} cobrança(s) · <strong className="text-zinc-900">{formatMoney(total)}</strong>
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : data?.length ? (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
          {data.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              title={
                <Link to={`/admin/barbearias/${p.subscription.barbershop.id}`} className="hover:underline">
                  {p.subscription.barbershop.name}
                  <span className="ml-1.5 text-xs font-normal text-zinc-400">{p.subscription.plan.name}</span>
                </Link>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Receipt />} title="Nada por aqui" />
      )}
    </div>
  );
}
