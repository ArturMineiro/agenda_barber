import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatMoney = (cents: number) => brl.format(cents / 100);

/** "11999990000" → "(11) 99999-0000" */
export function formatPhone(v?: string | null) {
  if (!v) return "";
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

/** Máscara enquanto digita */
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function whatsappLink(phone: string, text?: string) {
  const d = phone.replace(/\D/g, "");
  const full = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Data local "YYYY-MM-DD" (sem converter para UTC) */
export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** "2026-11-14" + 3 → "2026-11-17" */
export const addDaysToKey = (key: string, n: number) => toDateKey(addDays(fromDateKey(key), n));

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ---------- Fuso horário ----------
//
// Datas e horas aparecem sempre no fuso DA BARBEARIA (não no do aparelho): o painel e as páginas
// públicas chamam setDisplayTimeZone(barbearia.timezone) antes de desenhar o conteúdo.

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
let displayTz = DEFAULT_TIMEZONE;

export function setDisplayTimeZone(tz?: string | null) {
  displayTz = tz || DEFAULT_TIMEZONE;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** Formatador no fuso atual (criar Intl.DateTimeFormat é caro: guarda um por fuso) */
function zoned(name: string, opts: Intl.DateTimeFormatOptions, timeZone = displayTz) {
  const key = `${name}|${timeZone}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone });
    fmtCache.set(key, f);
  }
  return f;
}

/** Instante → "14:30" */
export const formatTime = (iso: string | Date) => zoned("time", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Instante → "sábado, 15 de novembro" */
export const formatLongDate = (d: string | Date) =>
  zoned("long", { weekday: "long", day: "numeric", month: "long" }).format(new Date(d));

/** Instante → "15/11, 14:30" */
export const formatDateTime = (iso: string) =>
  zoned("datetime", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Instante → "sáb" */
export const formatWeekdayShort = (iso: string | Date) => zoned("weekday", { weekday: "short" }).format(new Date(iso)).replace(".", "");

/** Instante → "sáb, 15/11" */
export const formatDayShort = (iso: string | Date) =>
  zoned("dayshort", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(iso)).replace(".", "");

/** Instante → "YYYY-MM-DD" do dia no fuso da barbearia */
export function dateKeyInZone(d: string | Date = new Date()) {
  const parts = zoned("key", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(d));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hoje, no fuso da barbearia */
export const todayKey = () => dateKeyInZone(new Date());

/**
 * Data de calendário "YYYY-MM-DD" → "sábado, 15 de novembro".
 * Não passa por instante: assim não troca de dia quando o aparelho está noutro fuso.
 */
export const formatDateKeyLong = (key: string) =>
  zoned("keylong", { weekday: "long", day: "numeric", month: "long" }, "UTC").format(new Date(`${key}T12:00:00Z`));

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
/** Para colunas só-data (ex.: vencimento) que chegam como meia-noite UTC */
export const formatDateOnly = (iso: string) => dateFmt.format(new Date(iso));

export const publicUrl = (slug: string) => `${window.location.origin}/${slug}`;

/** Diferença (min) entre o relógio do fuso e UTC num instante */
function zoneOffsetMinutes(ts: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Math.round((Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - ts) / 60_000);
}

/** "2026-11-14" + "15:30" no fuso da barbearia → ISO em UTC */
export function zonedDateTimeToISO(date: string, time: string, timeZone: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let ts = wall - zoneOffsetMinutes(wall, timeZone) * 60_000;
  ts = wall - zoneOffsetMinutes(ts, timeZone) * 60_000; // corrige perto de troca de horário
  return new Date(ts).toISOString();
}
