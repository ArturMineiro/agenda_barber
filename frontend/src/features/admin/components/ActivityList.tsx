import * as React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, History, KeyRound, LogIn, Search, ShieldAlert, ShieldCheck, Store, User, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Skeleton, Tabs } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { useActivity, type ActivityItem, type ActivityKind } from "../api";

const KINDS: { value: ActivityKind; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "changes", label: "Alterações" },
  { value: "auth", label: "Acessos" },
  { value: "clients", label: "Clientes" },
  { value: "admin", label: "Admin" },
];

const ROLE: Record<ActivityItem["actorRole"], { label: string; className: string }> = {
  OWNER: { label: "Dono", className: "bg-zinc-100 text-zinc-700" },
  BARBER: { label: "Barbeiro", className: "bg-sky-50 text-sky-700" },
  SUPER_ADMIN: { label: "Admin", className: "bg-violet-50 text-violet-700" },
  CLIENT: { label: "Cliente", className: "bg-emerald-50 text-emerald-700" },
  SYSTEM: { label: "Sistema", className: "bg-zinc-100 text-zinc-500" },
};

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function icon(a: ActivityItem) {
  if (a.action === "auth.login_failed") return <ShieldAlert className="text-red-500" />;
  if (a.action === "auth.login") return <LogIn className="text-emerald-600" />;
  if (a.action.startsWith("auth.") || a.action.includes("password") || a.action.includes("access")) return <KeyRound className="text-amber-600" />;
  if (a.actorRole === "SUPER_ADMIN") return <ShieldCheck className="text-violet-600" />;
  if (a.actorRole === "CLIENT") return <UserRound className="text-emerald-600" />;
  if (a.action.includes("appt") || a.action.includes("timeoff") || a.action.includes("queue")) return <CalendarDays className="text-zinc-500" />;
  return <User className="text-zinc-500" />;
}

/** Linha do tempo do log, com filtro por tipo, busca e "carregar mais" */
export function ActivityList({ barbershopId, showBarbershop }: { barbershopId?: string; showBarbershop?: boolean }) {
  const [kind, setKind] = React.useState<ActivityKind>("all");
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivity({ barbershopId, kind, q: debounced });
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  // agrupa por dia
  const groups: { day: string; items: ActivityItem[] }[] = [];
  for (const it of items) {
    const day = dayFmt.format(new Date(it.createdAt));
    const g = groups.at(-1);
    if (g?.day === day) g.items.push(it);
    else groups.push({ day, items: [it] });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Tabs value={kind} onChange={setKind} items={KINDS} />
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="Buscar pessoa, ação ou IP" className="h-10 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<History />} title="Nada por aqui" description="As ações aparecem aqui conforme forem acontecendo (o registro começou nesta atualização)." />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.day}>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase first-letter:uppercase">{g.day}</p>
              <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
                {g.items.map((a) => (
                  <Row key={a.id} a={a} showBarbershop={showBarbershop} />
                ))}
              </div>
            </div>
          ))}
          {hasNextPage && (
            <Button variant="outline" className="w-full" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
              <ChevronDown /> Carregar mais
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ a, showBarbershop }: { a: ActivityItem; showBarbershop?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const role = ROLE[a.actorRole] ?? ROLE.SYSTEM;
  const adminMode = a.details?.modoAdmin === true;
  const details = a.details ? Object.entries(a.details).filter(([k]) => k !== "rota" && k !== "modoAdmin") : [];

  return (
    <div className={cn("px-4 py-3", a.action === "auth.login_failed" && "bg-red-50/40")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left">
        <span className="mt-0.5 rounded-lg bg-zinc-50 p-1.5 ring-1 ring-zinc-100 [&_svg]:size-4">{icon(a)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{a.summary}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", role.className)}>{role.label}</span>
            {a.actorName && <span>{a.actorName}</span>}
            {adminMode && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">pelo modo admin</span>}
            {showBarbershop && a.barbershop && (
              <Link to={`/admin/barbearias/${a.barbershop.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-zinc-900 hover:underline">
                <Store className="size-3" /> {a.barbershop.name}
              </Link>
            )}
          </p>
        </div>
        <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{timeFmt.format(new Date(a.createdAt))}</span>
      </button>
      {open && (
        <div className="mt-2 ml-10 space-y-1 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
          {a.ip && (
            <p>
              <span className="text-zinc-400">IP:</span> {a.ip}
            </p>
          )}
          <p>
            <span className="text-zinc-400">Ação:</span> {a.action}
            {typeof a.details?.rota === "string" && <span className="text-zinc-400"> · {a.details.rota}</span>}
          </p>
          {details.length > 0 && <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-white p-2 font-mono text-[11px] whitespace-pre-wrap ring-1 ring-zinc-100">{JSON.stringify(Object.fromEntries(details), null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
