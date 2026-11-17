import { createBrowserRouter } from "react-router-dom";
import { GuestOnly, RequireAuth } from "@/features/auth/RequireAuth";
import { FullPageSpinner } from "@/components/ui/misc";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";

/**
 * Cada área é carregada sob demanda (code splitting):
 * o cliente que abre o link da barbearia no celular não baixa o código do painel/admin.
 */
const page =
  <T extends Record<string, React.ComponentType>>(
    load: () => Promise<T>,
    name: keyof T,
  ) =>
  async () => ({
    Component: (await load())[name],
  });

export const router = createBrowserRouter([
  {
    // qualquer erro (inclusive arquivo de versão antiga após deploy) cai na tela de erro do app
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: "/",
        lazy: page(() => import("@/pages/LandingPage"), "LandingPage"),
        HydrateFallback: FullPageSpinner,
      },
      {
        element: <GuestOnly />,
        children: [
          {
            path: "/entrar",
            lazy: page(() => import("@/features/auth/LoginPage"), "LoginPage"),
          },
          {
            path: "/cadastro",
            lazy: page(
              () => import("@/features/auth/RegisterPage"),
              "RegisterPage",
            ),
          },
        ],
      },
      {
        // dono e barbeiro da equipe (o barbeiro vê só a própria agenda)
        // admin da plataforma também, no "modo administrador" (gerenciando uma barbearia)
        element: <RequireAuth roles={["OWNER", "BARBER", "SUPER_ADMIN"]} />,
        children: [
          {
            path: "/painel",
            lazy: page(
              () => import("@/features/panel/PanelLayout"),
              "PanelLayout",
            ),
            children: [
              {
                index: true,
                lazy: page(
                  () => import("@/features/panel/pages/DashboardPage"),
                  "DashboardPage",
                ),
              },
              {
                path: "agenda",
                lazy: page(
                  () => import("@/features/panel/pages/AgendaPage"),
                  "AgendaPage",
                ),
              },
              {
                path: "fila",
                lazy: page(
                  () => import("@/features/panel/pages/QueuePage"),
                  "QueuePage",
                ),
              },
              {
                path: "servicos",
                lazy: page(
                  () => import("@/features/panel/pages/ServicesPage"),
                  "ServicesPage",
                ),
              },
              {
                path: "equipe",
                lazy: page(
                  () => import("@/features/panel/pages/TeamPage"),
                  "TeamPage",
                ),
              },
              {
                path: "folgas",
                lazy: page(
                  () => import("@/features/panel/pages/TimeOffPage"),
                  "TimeOffPage",
                ),
              },
              {
                path: "relatorios",
                lazy: page(
                  () => import("@/features/panel/pages/ReportsPage"),
                  "ReportsPage",
                ),
              },
              {
                path: "lembretes",
                lazy: page(
                  () => import("@/features/panel/pages/RemindersPage"),
                  "RemindersPage",
                ),
              },
              {
                path: "avaliacoes",
                lazy: page(
                  () => import("@/features/panel/pages/ReviewsPage"),
                  "ReviewsPage",
                ),
              },
              {
                path: "clientes",
                lazy: page(
                  () => import("@/features/panel/pages/ClientsPage"),
                  "ClientsPage",
                ),
              },
              {
                path: "notificacoes",
                lazy: page(
                  () => import("@/features/panel/pages/NotificationsPage"),
                  "NotificationsPage",
                ),
              },
              {
                path: "configuracoes",
                lazy: page(
                  () => import("@/features/panel/pages/SettingsPage"),
                  "SettingsPage",
                ),
              },
            ],
          },
        ],
      },
      {
        element: <RequireAuth roles={["SUPER_ADMIN"]} />,
        children: [
          {
            path: "/admin",
            lazy: page(
              () => import("@/features/admin/AdminLayout"),
              "AdminLayout",
            ),
            children: [
              {
                index: true,
                lazy: page(
                  () => import("@/features/admin/pages/AdminDashboardPage"),
                  "AdminDashboardPage",
                ),
              },
              {
                path: "barbearias",
                lazy: page(
                  () => import("@/features/admin/pages/AdminBarbershopsPage"),
                  "AdminBarbershopsPage",
                ),
              },
              {
                path: "barbearias/:id",
                lazy: page(
                  () =>
                    import("@/features/admin/pages/AdminBarbershopDetailPage"),
                  "AdminBarbershopDetailPage",
                ),
              },
              {
                path: "atividade",
                lazy: page(
                  () => import("@/features/admin/pages/AdminActivityPage"),
                  "AdminActivityPage",
                ),
              },
              {
                path: "planos",
                lazy: page(
                  () => import("@/features/admin/pages/AdminPlansPage"),
                  "AdminPlansPage",
                ),
              },
            ],
          },
        ],
      },
      // link do cliente para ver/remarcar/cancelar (sem login)
      {
        path: "/agendamento/:token",
        lazy: page(
          () => import("@/features/public/ManageAppointmentPage"),
          "ManageAppointmentPage",
        ),
      },
      // link público da barbearia: navalha.app/barbearia-do-ze
      {
        path: "/:slug",
        lazy: page(
          () => import("@/features/public/BookingPage"),
          "BookingPage",
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
