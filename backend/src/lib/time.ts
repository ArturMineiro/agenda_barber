import { DateTime } from "luxon";
import { badRequest } from "./errors";

export const DEFAULT_TZ = "America/Sao_Paulo";

/** Início do dia (no fuso informado) para uma data "YYYY-MM-DD" */
export function startOfDayInZone(date: string, zone: string) {
  const dt = DateTime.fromISO(date, { zone }).startOf("day");
  if (!dt.isValid) throw badRequest("Data inválida");
  return dt;
}

/** 0 = domingo … 6 = sábado (luxon usa 1 = segunda … 7 = domingo) */
export function weekdayOf(dt: DateTime) {
  return dt.weekday % 7;
}

/** "Hoje" no fuso informado, como Date em UTC meia-noite — formato usado nas colunas @db.Date */
export function todayAsDateOnly(zone = DEFAULT_TZ, now: DateTime = DateTime.now()) {
  const local = now.setZone(zone);
  return new Date(Date.UTC(local.year, local.month - 1, local.day));
}

export function dateOnly(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
