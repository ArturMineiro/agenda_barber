import { Bell, CalendarDays, Clock, Home, ListOrdered, Scissors, Settings, Star, Users, UserSquare2 } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { FullPageSpinner } from "@/components/ui/misc";
import { SupportLink } from "@/lib/support";
import { formatDateOnly, formatMoney, setDisplayTimeZone } from "@/lib/utils";
import type { Barbershop } from "@/types/api";
import { useBarbershop } from "./api";

const NAV: NavItem[] = [
  { to: "/painel", label: "Início", icon: Home, end: true, mobile: true },
  { to: "/painel/agenda", label: "Agenda", icon: CalendarDays, mobile: true },
  { to: "/painel/equipe", label: "Equipe", icon: Users, mobile: true },
  { to: "/painel/servicos", label: "Serviços", icon: Scissors, mobile: true },
  // no celular, os itens abaixo ficam em "Mais"
  { to: "/painel/clientes", label: "Clientes", icon: UserSquare2 },
  { to: "/painel/avaliacoes", label: "Avaliações", icon: Star },
  { to: "/painel/notificacoes", label: "Notificações", icon: Bell },
  { to: "/painel/configuracoes", label: "Ajustes", icon: Settings },
];

export function PanelLayout() {
  const { data: shop, isLoading } = useBarbershop();
  if (isLoading || !shop) return <FullPageSpinner />;
  // horários do painel no fuso da barbearia, mesmo que o celular esteja noutro
  setDisplayTimeZone(shop.timezone);

  // fila é presencial: não há agendamento pelo link para avisar nem para avaliar
  const queueOnly = ["/painel/notificacoes", "/painel/avaliacoes"];
  const nav = NAV.filter((n) => !(queueOnly.includes(n.to) && shop.bookingMode === "QUEUE")).map((n) => {
    // ordem de chegada: a agenda vira a fila
    if (n.to === "/painel/agenda" && shop.bookingMode === "QUEUE") return { ...n, to: "/painel/fila", label: "Fila", icon: ListOrdered };
    if (n.to === "/painel/equipe" && shop.teamType === "SOLO") return { ...n, label: "Horários", icon: Clock };
    return n;
  });

  return (
    <AppShell
      nav={nav}
      banner={<StatusBanner shop={shop} />}
      header={
        <div className="rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200/70">
          <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Barbearia</p>
          <p className="truncate font-semibold">{shop.name}</p>
        </div>
      }
    />
  );
}

/** Avisos importantes no topo: aprovação pendente, suspensão, mensalidade */
function StatusBanner({ shop }: { shop: Barbershop }) {
  const overdue = shop.subscription?.payments?.find((p) => p.status === "OVERDUE");
  const pending = shop.subscription?.payments?.find((p) => p.status === "PENDING");

  let tone = "";
  let text: React.ReactNode = null;

  if (shop.status === "PENDING") {
    tone = "bg-amber-50 text-amber-900 border-amber-200";
    text = (
      <>
        <strong>Cadastro em análise.</strong> Configure serviços e horários enquanto isso — seu link fica no ar assim que for aprovado.{" "}
        <SupportLink message={`Olá! Cadastrei a barbearia "${shop.name}" no Navalha e queria liberar o acesso.`}>Pedir liberação</SupportLink>
      </>
    );
  } else if (shop.status === "SUSPENDED") {
    tone = "bg-red-50 text-red-900 border-red-200";
    text = (
      <>
        <strong>Barbearia suspensa</strong>
        {shop.statusReason ? ` — ${shop.statusReason}` : ""}. Seu link não está recebendo agendamentos.{" "}
        <SupportLink message={`Olá! Minha barbearia "${shop.name}" está suspensa no Navalha e queria regularizar.`} />
      </>
    );
  } else if (shop.status === "REJECTED") {
    tone = "bg-red-50 text-red-900 border-red-200";
    text = (
      <>
        Cadastro não aprovado{shop.statusReason ? `: ${shop.statusReason}` : ""}.{" "}
        <SupportLink message={`Olá! O cadastro da barbearia "${shop.name}" no Navalha não foi aprovado e queria entender o motivo.`} />
      </>
    );
  } else if (overdue) {
    tone = "bg-red-50 text-red-900 border-red-200";
    text = (
      <>
        <strong>Mensalidade em atraso</strong> ({formatMoney(overdue.amountCents)}, venceu em {formatDateOnly(overdue.dueDate)}). Regularize para não ter o link suspenso.{" "}
        <SupportLink message={`Olá! Quero pagar a mensalidade da barbearia "${shop.name}" no Navalha.`}>Pagar com o suporte</SupportLink>
      </>
    );
  } else if (pending) {
    tone = "bg-sky-50 text-sky-900 border-sky-200";
    text = (
      <>
        Próxima mensalidade: <strong>{formatMoney(pending.amountCents)}</strong> vence em {formatDateOnly(pending.dueDate)}.
      </>
    );
  }

  if (!text) return null;
  return <div className={`border-b px-4 py-2.5 text-center text-sm sm:px-6 ${tone}`}>{text}</div>;
}
