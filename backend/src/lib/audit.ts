import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Log de atividades.
 *
 * Um middleware só (registrado antes das rotas) escuta o fim de cada requisição que ALTERA dados
 * (POST/PUT/PATCH/DELETE) e grava quem fez, o quê e quando. Rota nova entra no log sozinha
 * (com a descrição genérica até ganhar uma frase em ACTIONS).
 *
 * Quem não é usuário logado (cliente pelo link, login) informa o autor em res.locals.audit.
 */

export type ActorRole = "OWNER" | "BARBER" | "SUPER_ADMIN" | "CLIENT" | "SYSTEM";

export interface AuditInput {
  barbershopId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole: ActorRole;
  action: string;
  summary: string;
  details?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Complemento que a rota pode deixar em res.locals.audit */
export interface AuditLocals {
  barbershopId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: ActorRole;
  /** nome do que foi mexido (serviço, cliente…) para a frase ficar clara */
  subject?: string | null;
  details?: Record<string, unknown>;
  /** true = não registrar esta requisição */
  skip?: boolean;
}

type Ctx = { body: Record<string, unknown>; subject?: string | null };
type Label = { action: string; summary: string | ((c: Ctx) => string) };

/** "Desmarcou o horário de João" / "Desmarcou um horário" */
const of = (withName: string, without: string) => (c: Ctx) => (c.subject ? `${withName} ${c.subject}` : without);

const named = (text: string, key = "name") => (c: Ctx) => {
  const n = c.subject ?? (typeof c.body[key] === "string" ? (c.body[key] as string) : null);
  return n ? `${text} "${n}"` : text;
};

/** "MÉTODO /caminho" (ids trocados por :x) → frase do log */
const ACTIONS: Record<string, Label> = {
  // login e conta
  "POST /auth/register": { action: "auth.register", summary: "Criou a conta e cadastrou a barbearia" },
  "POST /auth/login": { action: "auth.login", summary: "Entrou no sistema" },
  "POST /auth/password": { action: "auth.password", summary: "Trocou a própria senha" },

  // painel: barbearia e catálogo
  "PUT /panel/barbershop": { action: "panel.settings", summary: "Alterou os ajustes da barbearia" },
  "POST /panel/services": { action: "panel.service.create", summary: named("Cadastrou o serviço") },
  "PUT /panel/services/:x": { action: "panel.service.update", summary: named("Editou o serviço") },
  "DELETE /panel/services/:x": { action: "panel.service.delete", summary: named("Removeu o serviço") },
  "POST /panel/services/:x/photos": { action: "panel.photo.add", summary: "Adicionou foto ao catálogo" },
  "DELETE /panel/services/:x/photos/:x": { action: "panel.photo.delete", summary: "Removeu foto do catálogo" },
  "POST /panel/services/:x/photos/:x/cover": { action: "panel.photo.cover", summary: "Trocou a capa de um serviço" },
  "POST /panel/uploads": { action: "panel.upload", summary: "Enviou uma imagem" },

  // equipe
  "POST /panel/professionals": { action: "panel.pro.create", summary: named("Cadastrou o profissional") },
  "PUT /panel/professionals/:x": { action: "panel.pro.update", summary: named("Editou o profissional") },
  "DELETE /panel/professionals/:x": { action: "panel.pro.delete", summary: named("Removeu o profissional") },
  "PUT /panel/professionals/:x/hours": { action: "panel.pro.hours", summary: of("Alterou os horários de", "Alterou horários de atendimento") },
  "POST /panel/professionals/:x/access": { action: "panel.pro.access", summary: of("Criou o login de", "Criou o login de um profissional") },
  "POST /panel/professionals/:x/access/reset": { action: "panel.pro.access_reset", summary: of("Gerou senha temporária para", "Gerou senha temporária para um profissional") },
  "DELETE /panel/professionals/:x/access": { action: "panel.pro.access_remove", summary: of("Removeu o login de", "Removeu o login de um profissional") },
  "POST /panel/time-offs": { action: "panel.timeoff.create", summary: "Marcou folga/bloqueio na agenda" },
  "DELETE /panel/time-offs/:x": { action: "panel.timeoff.delete", summary: "Removeu folga/bloqueio da agenda" },

  // agenda e fila
  "POST /panel/appointments": { action: "panel.appt.create", summary: (c) => (typeof c.body.clientName === "string" ? `Agendou ${c.body.clientName}` : "Criou um agendamento") },
  "PATCH /panel/appointments/:x/status": { action: "panel.appt.status", summary: (c) => `Mudou o status de um horário${c.subject ? ` de ${c.subject}` : ""} para ${STATUS[String(c.body.status)] ?? c.body.status}` },
  "POST /panel/appointments/:x/cancel": { action: "panel.appt.cancel", summary: of("Desmarcou o horário de", "Desmarcou um horário") },
  "POST /panel/appointments/:x/reminder": { action: "panel.appt.reminder", summary: of("Enviou lembrete para", "Enviou um lembrete") },
  "PATCH /panel/reviews/:x": { action: "panel.review.visibility", summary: (c) => (c.body.hidden ? "Ocultou uma avaliação da página" : "Voltou a mostrar uma avaliação") },
  "POST /panel/queue": { action: "panel.queue.add", summary: (c) => (typeof c.body.clientName === "string" ? `Colocou ${c.body.clientName} na fila` : "Colocou um cliente na fila") },
  "POST /panel/queue/next": { action: "panel.queue.next", summary: "Chamou o próximo da fila" },
  "PATCH /panel/queue/:x/status": { action: "panel.queue.status", summary: "Atualizou um atendimento da fila" },
  "PATCH /panel/queue/professionals/:x/open": { action: "panel.queue.open", summary: (c) => (c.body.open ? "Abriu a fila" : "Fechou a fila") },
  "POST /panel/push/subscribe": { action: "panel.push.on", summary: "Ativou notificações num aparelho" },
  "POST /panel/push/unsubscribe": { action: "panel.push.off", summary: "Desativou notificações num aparelho" },
  "POST /panel/push/test": { action: "panel.push.test", summary: "Testou as notificações" },

  // cliente pelo link público
  "POST /public/barbershops/:x/bookings": { action: "client.book", summary: (c) => `Agendou pelo link${c.subject ? `: ${c.subject}` : ""}` },
  "POST /public/appointments/:x/cancel": { action: "client.cancel", summary: "Cancelou pelo link" },
  "POST /public/appointments/:x/reschedule": { action: "client.reschedule", summary: "Remarcou pelo link" },
  "POST /public/appointments/:x/review": { action: "client.review", summary: (c) => `Avaliou com ${c.body.rating} estrela(s)` },

  // administração da plataforma
  "POST /admin/barbershops/:x/approve": { action: "admin.approve", summary: "Admin aprovou a barbearia" },
  "POST /admin/barbershops/:x/reject": { action: "admin.reject", summary: "Admin recusou o cadastro" },
  "POST /admin/barbershops/:x/suspend": { action: "admin.suspend", summary: (c) => `Admin suspendeu a barbearia${c.body.reason ? ` — ${c.body.reason}` : ""}` },
  "POST /admin/barbershops/:x/reactivate": { action: "admin.reactivate", summary: "Admin reativou a barbearia" },
  "POST /admin/barbershops/:x/owner-password": { action: "admin.owner_password", summary: "Admin gerou senha temporária para o dono" },
  "PUT /admin/barbershops/:x/subscription": { action: "admin.subscription", summary: "Admin alterou o plano/valor combinado" },
  "POST /admin/plans": { action: "admin.plan.create", summary: named("Admin criou o plano") },
  "PUT /admin/plans/:x": { action: "admin.plan.update", summary: named("Admin editou o plano") },
};

const STATUS: Record<string, string> = { CONFIRMED: "confirmado", COMPLETED: "concluído", CANCELED: "cancelado", NO_SHOW: "não veio" };

/** Não vai para o log: muda a cada requisição ou é sensível */
const SKIP = new Set(["POST /auth/logout"]);
const SECRET_KEY = /pass|senha|token|secret|auth|p256dh|endpoint|keys/i;

/** Tira senhas/tokens e corta textos longos (o log não pode virar cópia de dados sensíveis) */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return "…";
  if (typeof value === "string") return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEY.test(k) ? "[oculto]" : sanitize(v, depth + 1);
    return out;
  }
  return value;
}

const ID_SEGMENT = /\/[a-z0-9]{20,}(?=\/|$)/gi;

/**
 * "/api/panel/services/cmx…/photos/cmy…" → "POST /panel/services/:x/photos/:x".
 * Usa a URL completa (e não req.baseUrl/req.route): quando a rota dá erro, o Express já restaurou o baseUrl.
 */
export function routeKey(req: Request) {
  const path = (req.originalUrl.split("?")[0] ?? "/")
    .replace(/^\/api/, "")
    .replace(/\/+$/, "")
    .replace(ID_SEGMENT, "/:x")
    // slug da página pública não tem cara de id
    .replace(/^\/public\/barbershops\/[^/]+/, "/public/barbershops/:x");
  return `${req.method} ${path || "/"}`;
}

/** Barbearia de um dono/barbeiro (para logins e cadastro, que não passam pelo painel) */
async function barbershopOf(userId: string) {
  const [owned, pro] = await Promise.all([
    prisma.barbershop.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    prisma.professional.findUnique({ where: { userId }, select: { barbershopId: true } }),
  ]);
  return owned?.id ?? pro?.barbershopId ?? null;
}

/** Grava uma linha no log. Nunca lança erro: log não pode derrubar a ação do usuário. */
export async function recordAudit(input: AuditInput) {
  try {
    let barbershopId = input.barbershopId ?? null;
    if (!barbershopId && input.actorId && (input.actorRole === "OWNER" || input.actorRole === "BARBER")) {
      barbershopId = await barbershopOf(input.actorId);
    }
    await prisma.auditLog.create({
      data: {
        barbershopId,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        actorRole: input.actorRole,
        action: input.action,
        summary: input.summary.slice(0, 300),
        details: (input.details ? sanitize(input.details) : undefined) as Prisma.InputJsonValue | undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar", err);
  }
}

/** Middleware: registra toda alteração que deu certo (e tentativas de login com senha errada) */
export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  // o corpo é lido aqui: depois da resposta o handler pode ter mexido nele
  const body = req.body && typeof req.body === "object" ? { ...req.body } : {};

  res.on("finish", () => {
    const key = routeKey(req);
    const locals = (res.locals.audit ?? {}) as AuditLocals;
    if (locals.skip || SKIP.has(key)) return;

    const ok = res.statusCode < 400;
    const loginFailed = key === "POST /auth/login" && (res.statusCode === 401 || res.statusCode === 429);
    if (!ok && !loginFailed) return;

    const label = ACTIONS[key];
    const ctx: Ctx = { body, subject: locals.subject };
    const summary = loginFailed
      ? res.statusCode === 429
        ? "Login bloqueado por excesso de tentativas"
        : "Tentativa de login com senha errada"
      : label
        ? typeof label.summary === "function"
          ? label.summary(ctx)
          : label.summary
        : `${req.method} ${req.originalUrl.split("?")[0]}`;

    const user = req.user;
    const paramId = typeof req.params?.id === "string" ? req.params.id : undefined;
    const adminId = paramId && /^(POST|PUT) \/admin\/barbershops\//.test(key) ? paramId : undefined;
    void (async () => {
      let barbershopId = locals.barbershopId ?? req.barbershop?.id ?? adminId ?? null;
      if (!barbershopId && key.startsWith("POST /admin/payments/") && paramId) {
        const p = await prisma.payment
          .findUnique({ where: { id: paramId }, select: { subscriptionId: true } })
          .then((x) => (x ? prisma.subscription.findUnique({ where: { id: x.subscriptionId }, select: { barbershopId: true } }) : null))
          .catch(() => null);
        barbershopId = p?.barbershopId ?? null;
      }
      let actorId = locals.actorId ?? user?.id ?? null;
      let actorName = locals.actorName ?? user?.name ?? null;
      let actorRole: ActorRole = locals.actorRole ?? (user?.role as ActorRole | undefined) ?? "CLIENT";
      if (loginFailed) {
        // quem tentou entrar (pelo e-mail digitado), para aparecer no log da barbearia dele
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const target = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, role: true } }).catch(() => null) : null;
        actorId = target?.id ?? null;
        actorName = target?.name ?? email ?? null;
        actorRole = (target?.role as ActorRole | undefined) ?? "CLIENT";
      }
      await recordAudit({
        barbershopId,
        actorId,
        actorName,
        actorRole,
        action: loginFailed ? "auth.login_failed" : (label?.action ?? "other"),
        summary,
        details: {
          ...(Object.keys(body).length ? { dados: body } : {}),
          ...(locals.details ?? {}),
          // admin mexendo no painel de outra barbearia
          ...(user?.role === "SUPER_ADMIN" && key.startsWith(`${req.method} /panel`) ? { modoAdmin: true } : {}),
          ...(loginFailed ? { email: body.email } : {}),
          rota: key,
        },
        ip: req.ip ?? null,
      });
    })();
  });
  next();
}

/** Atalho para as rotas: complementa o que vai para o log desta requisição */
export function auditInfo(res: Response, info: AuditLocals) {
  res.locals.audit = { ...((res.locals.audit as AuditLocals | undefined) ?? {}), ...info };
}
