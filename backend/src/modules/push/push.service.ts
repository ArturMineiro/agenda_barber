import webpush from "web-push";
import { DateTime } from "luxon";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

/**
 * Notificações no celular do dono (Web Push), sem app de loja.
 *
 * O navegador do dono gera uma "inscrição" (endpoint + chaves) e manda para cá.
 * Quando um cliente agenda, remarca ou desmarca, a API envia a notificação
 * pelo serviço de push do próprio navegador (Google, Apple, Mozilla).
 */
export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  /** página aberta ao tocar na notificação */
  url?: string;
  /** notificações com a mesma tag se substituem em vez de empilhar */
  tag?: string;
}

/** Envia para todos os aparelhos inscritos da barbearia. Nunca lança erro: notificação não pode quebrar o agendamento. */
export async function notifyBarbershop(barbershopId: string, payload: PushPayload) {
  if (!pushEnabled) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { barbershopId } });
    await Promise.all(subs.map((s) => sendTo(s, payload)));
  } catch (err) {
    console.error("[push] falha ao notificar", err);
  }
}

export async function sendTo(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "high" },
    );
    await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // inscrição expirada ou removida pelo usuário: apaga para não tentar de novo
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      console.error("[push] envio falhou", status ?? err);
    }
    return false;
  }
}

// ---------- mensagens ----------

interface ApptInfo {
  barbershopId: string;
  clientName: string;
  startsAt: Date;
  service: { name: string };
  professional: { name: string };
  barbershop: { timezone: string; teamType: string };
}

function when(date: Date, tz: string) {
  const d = DateTime.fromJSDate(date).setZone(tz).setLocale("pt-BR");
  const today = DateTime.now().setZone(tz).startOf("day");
  const diff = Math.round(d.startOf("day").diff(today, "days").days);
  const day = diff === 0 ? "hoje" : diff === 1 ? "amanhã" : d.toFormat("ccc dd/LL").replace(".", "");
  return `${day} às ${d.toFormat("HH:mm")}`;
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const withPro = (a: ApptInfo) => (a.barbershop.teamType === "SOLO" ? "" : ` com ${firstName(a.professional.name)}`);
const agendaUrl = (a: ApptInfo) => `/painel/agenda?data=${DateTime.fromJSDate(a.startsAt).setZone(a.barbershop.timezone).toISODate()}`;

export function notifyNewBooking(a: ApptInfo) {
  return notifyBarbershop(a.barbershopId, {
    title: "✂️ Novo agendamento",
    body: `${a.clientName} · ${a.service.name}${withPro(a)} · ${when(a.startsAt, a.barbershop.timezone)}`,
    url: agendaUrl(a),
  });
}

export function notifyReschedule(a: ApptInfo, previous: Date) {
  return notifyBarbershop(a.barbershopId, {
    title: "🔁 Horário remarcado",
    body: `${a.clientName} mudou de ${when(previous, a.barbershop.timezone)} para ${when(a.startsAt, a.barbershop.timezone)} · ${a.service.name}${withPro(a)}`,
    url: agendaUrl(a),
  });
}

export function notifyCancel(a: ApptInfo, reason?: string | null) {
  return notifyBarbershop(a.barbershopId, {
    title: "❌ Horário desmarcado",
    body: `${a.clientName} desmarcou ${a.service.name}${withPro(a)} de ${when(a.startsAt, a.barbershop.timezone)}${reason ? ` — "${reason}"` : ""}`,
    url: agendaUrl(a),
  });
}
