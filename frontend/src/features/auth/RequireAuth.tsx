import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "@navalha/shared";
import { FullPageSpinner } from "@/components/ui/misc";
import { homeFor, useMe } from "./api";

export function RequireAuth({ roles }: { roles: Role[] }) {
  const { data: user, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

/** Para /entrar e /cadastro: quem já está logado vai direto pro painel */
export function GuestOnly() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
