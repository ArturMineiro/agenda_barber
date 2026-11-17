import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, PauseCircle, Store, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { formatMoney } from "@/lib/utils";
import { useAdminBarbershops, useAdminStats } from "../api";
import { BarbershopRow } from "../components/BarbershopRow";

export function AdminDashboardPage() {
  const { data: stats } = useAdminStats();
  const { data: pending, isLoading } = useAdminBarbershops({ status: "PENDING" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Saúde da plataforma e o que precisa da sua atenção."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!stats ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Combinado por mês" value={formatMoney(stats.mrrCents)} hint="Soma das barbearias ativas" icon={<TrendingUp />} />
            <StatCard label="Barbearias ativas" value={stats.barbershops.ACTIVE} icon={<Store />} />
            <StatCard label="Aguardando aprovação" value={stats.barbershops.PENDING} icon={<Clock />} />
            <StatCard label="Suspensas" value={stats.barbershops.SUSPENDED} icon={<PauseCircle />} />
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
