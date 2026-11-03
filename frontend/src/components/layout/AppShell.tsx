import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui/misc";
import { useLogout, useMe } from "@/features/auth/api";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** aparece na barra inferior do celular (máx. 5) */
  mobile?: boolean;
}

interface AppShellProps {
  nav: NavItem[];
  /** conteúdo extra acima da navegação (ex.: nome da barbearia) */
  header?: React.ReactNode;
  /** faixa acima do conteúdo (ex.: aviso de mensalidade) */
  banner?: React.ReactNode;
}

/**
 * Layout do painel: sidebar fixa no desktop, barra de navegação inferior no celular
 * (mais fácil de alcançar com o polegar).
 */
export function AppShell({ nav, header, banner }: AppShellProps) {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const mobileNav = nav.filter((n) => n.mobile);

  const handleLogout = () => logout.mutate(undefined, { onSuccess: () => navigate("/entrar") });

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        {header && <div className="px-3 pb-3">{header}</div>}
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                )
              }
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="flex items-center gap-3 border-t border-zinc-100 p-4">
            <Avatar name={user.name} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Sair">
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200/70 bg-white/85 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Logo className="text-lg" />
        <button onClick={handleLogout} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Sair">
          <LogOut className="size-5" />
        </button>
      </header>

      {banner}

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        {header && <div className="mb-4 lg:hidden">{header}</div>}
        <Outlet />
      </main>

      {/* Navegação inferior mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-lg pb-safe lg:hidden">
        <div className="mx-auto flex max-w-md justify-around px-2 pt-1.5">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium transition",
                  isActive ? "text-zinc-900" : "text-zinc-400",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("rounded-full px-4 py-1 transition", isActive && "bg-zinc-900 text-white")}>
                    <item.icon className="size-5" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
