import * as React from "react";
import { Search, Store } from "lucide-react";
import type { BarbershopStatus } from "@navalha/shared";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton, Tabs } from "@/components/ui/misc";
import { useAdminBarbershops, useAdminStats } from "../api";
import { BarbershopRow } from "../components/BarbershopRow";

type Filter = BarbershopStatus | "ALL";

export function AdminBarbershopsPage() {
  const [status, setStatus] = React.useState<Filter>("ALL");
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: stats } = useAdminStats();
  const { data, isLoading } = useAdminBarbershops({ status: status === "ALL" ? undefined : status, q: debounced || undefined });
  const c = stats?.barbershops;

  return (
    <div className="space-y-4">
      <PageHeader title="Barbearias" />
      <div className="relative">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="Buscar por nome, link ou e-mail do dono" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Tabs<Filter>
        value={status}
        onChange={setStatus}
        items={[
          { value: "ALL", label: "Todas" },
          { value: "PENDING", label: "Pendentes", count: c?.PENDING },
          { value: "ACTIVE", label: "Ativas", count: c?.ACTIVE },
          { value: "SUSPENDED", label: "Suspensas", count: c?.SUSPENDED },
          { value: "REJECTED", label: "Recusadas" },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : data?.length ? (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
          {data.map((s) => (
            <BarbershopRow key={s.id} shop={s} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Store />} title="Nenhuma barbearia encontrada" />
      )}
    </div>
  );
}
