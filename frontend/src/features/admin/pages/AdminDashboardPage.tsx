import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, DollarSign, RefreshCw, Store, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { formatMoney } from "@/lib/utils";
import { useAdminBarbershops, useAdminStats, useSyncBilling } from "../api";
import { BarbershopRow } from "../components/BarbershopRow";

export function AdminDashboardPage() {
  const { data: stats } = useAdminStats();
  const { data: pending, isLoading } = useAdminBarbershops({ status: "PENDING" });
  const sync = useSyncBilling();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Saúde da plataforma e o que precisa da sua atenção."
        actions={
          <Button variant="outline" size="sm" onClick={() => sync.mutate()} loading={sync.isPending}>
            <RefreshCw /> Sincronizar cobranças
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!stats ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Receita mensal (MRR)" value={formatMoney(stats.mrrCents)} icon={<TrendingUp />} />
            <StatCard label="Recebido no mês" value={formatMoney(stats.receivedThisMonthCents)} icon={<DollarSign />} />
            <StatCard label="Barbearias ativas" value={stats.barbershops.ACTIVE} hint={`${stats.barbershops.SUSPENDED} suspensa(s)`} icon={<Store />} />
            <StatCard
              label="Em atraso"
              value={formatMoney(stats.overdueCents)}
              hint={`${stats.overdueCount} cobrança(s)`}
              icon={<AlertTriangle />}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-600" />
            <CardTitle>Aguardando aprovação</CardTitle>
          </div>
          <Link to="/admin/barbearias" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
            Todas <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-2 sm:px-0">
          {isLoading ? (
            <div className="space-y-2 px-4">
              <Skeleton className="h-14" />
            </div>
          ) : pending?.length ? (
            <div className="divide-y divide-zinc-100">
              {pending.map((s) => (
                <BarbershopRow key={s.id} shop={s} />
              ))}
            </div>
          ) : (
            <div className="px-4 pb-2">
              <EmptyState icon={<CheckCircle2 />} title="Tudo em dia" description="Nenhum cadastro aguardando aprovação." />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
