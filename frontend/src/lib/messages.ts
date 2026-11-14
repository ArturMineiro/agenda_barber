import { addDaysToKey, dateKeyInZone, formatLongDate, formatTime, todayKey, whatsappLink } from "./utils";

/**
 * Mensagens prontas que o dono manda ao cliente.
 * Abrem o WhatsApp já escritas (wa.me) — o dono só toca em enviar.
 * Envio 100% automático exige a API oficial do WhatsApp Business (paga).
 */

export const appointmentLink = (token: string) => `${window.location.origin}/agendamento/${token}`;

interface Ctx {
  clientName: string;
  clientPhone: string;
  startsAt: string;
  serviceName: string;
  shopName: string;
  shopSlug: string;
  token?: string;
}

const first = (name: string) => name.trim().split(" ")[0];
const when = (iso: string) => `${formatLongDate(iso)} às ${formatTime(iso)}`;
/** "amanhã (sábado) às 14:00", "hoje às 14:00" ou a data completa */
const whenRelative = (iso: string) => {
  const key = dateKeyInZone(iso);
  if (key === todayKey()) return `hoje às ${formatTime(iso)}`;
  if (key === addDaysToKey(todayKey(), 1)) return `amanhã (${formatLongDate(iso).split(",")[0]}) às ${formatTime(iso)}`;
  return when(iso);
};
const linkLine = (token?: string, text = "Para ver, remarcar ou cancelar") => (token ? `\n\n${text}: ${appointmentLink(token)}` : "");

export const messages = {
  confirm: (c: Ctx) =>
    `Olá ${first(c.clientName)}! Seu horário na *${c.shopName}* está confirmado ✂️\n\n📅 ${when(c.startsAt)}\n💈 ${c.serviceName}${linkLine(c.token)}`,

  reminder: (c: Ctx) =>
    `Oi ${first(c.clientName)}, passando para lembrar do seu horário na *${c.shopName}*: ${whenRelative(c.startsAt)} (${c.serviceName}). Te esperamos!${linkLine(c.token, "Se precisar remarcar")}`,

  delay: (c: Ctx, minutes: number) =>
    `Oi ${first(c.clientName)}, aqui é da *${c.shopName}*. Estamos com um atraso de cerca de ${minutes} min no seu horário das ${formatTime(c.startsAt)}. Desculpe o transtorno!`,

  review: (c: Ctx) =>
    `Oi ${first(c.clientName)}, obrigado por vir na *${c.shopName}*! ✂️\n\nO que achou do ${c.serviceName.toLowerCase()}? Avaliar leva 10 segundos e ajuda muito a gente${c.token ? `: ${appointmentLink(c.token)}` : ""}`,

  canceled: (c: Ctx, reason?: string | null) =>
    `Olá ${first(c.clientName)}, aqui é da *${c.shopName}*. Infelizmente precisamos desmarcar seu horário de ${when(c.startsAt)} (${c.serviceName}).${reason ? `\n\nMotivo: ${reason}` : ""}\n\nDesculpe o transtorno! Você pode escolher outro horário aqui: ${window.location.origin}/${c.shopSlug}`,
};

export function sendWhatsApp(phone: string, text: string) {
  window.open(whatsappLink(phone, text), "_blank", "noopener");
}
