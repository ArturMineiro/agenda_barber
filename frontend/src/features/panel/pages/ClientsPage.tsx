import * as React from "react";
import { MessageCircle, Search, UserSquare2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { formatDateTime, formatMoney, formatPhone, whatsappLink } from "@/lib/utils";
import { useClients } from "../api";

export function ClientsPage() {
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isLoading } = useClients(debounced);

  return (
    <div>
      <PageHeader title="Clientes" description="Todo mundo que já agendou com você." />
      <div className="relative mb-4">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="Buscar por nome ou telefone" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : data?.length ? (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
          {data.map((c) => (
            <div key={c.phone} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={c.name ?? "?"} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-zinc-500">
                  {c.visits} visita(s) · última {formatDateTime(c.lastVisit)}
                </p>
              </div>
              <div className="hidden text-right text-sm sm:block">
                <p className="font-medium">{formatMoney(c.totalCents)}</p>
                <p className="text-xs text-zinc-500">{formatPhone(c.phone)}</p>
              </div>
              <a
                href={whatsappLink(c.phone)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl p-2.5 text-emerald-600 hover:bg-emerald-50"
                aria-label="WhatsApp"
              >
                <MessageCircle className="size-5" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<UserSquare2 />} title={q ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"} description="Os clientes aparecem aqui depois do primeiro agendamento." />
      )}
    </div>
  );
}
