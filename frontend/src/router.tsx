import { createBrowserRouter } from "react-router-dom";
import { GuestOnly, RequireAuth } from "@/features/auth/RequireAuth";
import { FullPageSpinner } from "@/components/ui/misc";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Cada área é carregada sob demanda (code splitting):
 * o cliente que abre o link da barbearia no celular não baixa o código do painel/admin.
 */
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T) => async () => ({
  Component: (await load())[name],
});

export const router = createBrowserRouter([
  { path: "/", lazy: page(() => import("@/pages/LandingPage"), "LandingPage"), HydrateFallback: FullPageSpinner },
  {
    element: <GuestOnly />,
    children: [
      { path: "/entrar", lazy: page(() => import("@/features/auth/LoginPage"), "LoginPage") },
      { path: "/cadastro", lazy: page(() => import("@/features/auth/RegisterPage"), "RegisterPage") },
    ],
  },
  {
    element: <RequireAuth roles={["OWNER"]} />,
    children: [
      {
        path: "/painel",
        lazy: page(() => import("@/features/panel/PanelLayout"), "PanelLayout"),
        children: [
          { index: true, lazy: page(() => import("@/features/panel/pages/DashboardPage"), "DashboardPage") },
          { path: "agenda", lazy: page(() => import("@/features/panel/pages/AgendaPage"), "AgendaPage") },
          { path: "fila", lazy: page(() => import("@/features/panel/pages/QueuePage"), "QueuePage") },
          { path: "servicos", lazy: page(() => import("@/features/panel/pages/ServicesPage"), "ServicesPage") },
          { path: "equipe", lazy: page(() => import("@/features/panel/pages/TeamPage"), "TeamPage") },
          { path: "clientes", lazy: page(() => import("@/features/panel/pages/ClientsPage"), "ClientsPage") },
          { path: "notificacoes", lazy: page(() => import("@/features/panel/pages/NotificationsPage"), "NotificationsPage") },
          { path: "configuracoes", lazy: page(() => import("@/features/panel/pages/SettingsPage"), "SettingsPage") },
        ],
      },
    ],
  },
  {
    element: <RequireAuth roles={["SUPER_ADMIN"]} />,
    children: [
      {
        path: "/admin",
        lazy: page(() => import("@/features/admin/AdminLayout"), "AdminLayout"),
        children: [
          { index: true, lazy: page(() => import("@/features/admin/pages/AdminDashboardPage"), "AdminDashboardPage") },
          { path: "barbearias", lazy: page(() => import("@/features/admin/pages/AdminBarbershopsPage"), "AdminBarbershopsPage") },
          { path: "barbearias/:id", lazy: page(() => import("@/features/admin/pages/AdminBarbershopDetailPage"), "AdminBarbershopDetailPage") },
          { path: "mensalidades", lazy: page(() => import("@/features/admin/pages/AdminPaymentsPage"), "AdminPaymentsPage") },
          { path: "planos", lazy: page(() => import("@/features/admin/pages/AdminPlansPage"), "AdminPlansPage") },
        ],
      },
    ],
  },
  // link do cliente para ver/remarcar/cancelar (sem login)
  { path: "/agendamento/:token", lazy: page(() => import("@/features/public/ManageAppointmentPage"), "ManageAppointmentPage") },
  // link público da barbearia: navalha.app/barbearia-do-ze
  { path: "/:slug", lazy: page(() => import("@/features/public/BookingPage"), "BookingPage") },
  { path: "*", element: <NotFoundPage /> },
]);
