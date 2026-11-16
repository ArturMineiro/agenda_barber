import { History, LayoutDashboard, Package, Receipt, Store } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { setDisplayTimeZone } from "@/lib/utils";

const NAV: NavItem[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, end: true, mobile: true },
  { to: "/admin/barbearias", label: "Barbearias", icon: Store, mobile: true },
  { to: "/admin/mensalidades", label: "Mensalidades", icon: Receipt, mobile: true },
  { to: "/admin/planos", label: "Planos", icon: Package, mobile: true },
  { to: "/admin/atividade", label: "Atividade", icon: History },
];

export function AdminLayout() {
  // a plataforma (cobranças, cadastros) usa o horário de Brasília
  setDisplayTimeZone(null);
  return (
    <AppShell
      nav={NAV}
      header={
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-800 uppercase ring-1 ring-amber-200">
          Administração da plataforma
        </div>
      }
    />
  );
}
