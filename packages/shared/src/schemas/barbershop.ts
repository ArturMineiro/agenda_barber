import { z } from "zod";
import { BOOKING_MODES, PAGE_THEMES } from "../enums";
import {
  hexColorSchema,
  optionalPhoneSchema,
  optionalTextSchema,
  optionalImageSchema,
  slugSchema,
} from "./common";

export const SLOT_INTERVALS = [10, 15, 20, 30, 60] as const;

/** Personalização da página pública e regras de agenda, feita pelo dono */
export const barbershopSettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  slug: slugSchema,
  description: optionalTextSchema(600),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .transform((v) => (v === "" ? null : v))
    .nullish(),
  address: optionalTextSchema(200),
  city: optionalTextSchema(80),
  logoUrl: optionalImageSchema,
  coverUrl: optionalImageSchema,
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  /** fundo claro ou escuro na página do cliente */
  pageTheme: z.enum(PAGE_THEMES).default("LIGHT"),
  bookingMode: z.enum(BOOKING_MODES),
  slotIntervalMinutes: z.number().refine((v) => (SLOT_INTERVALS as readonly number[]).includes(v), "Intervalo inválido"),
  /** Antecedência mínima para o cliente agendar (minutos) */
  minAdvanceMinutes: z.number().int().min(0).max(60 * 48),
  /** Até quantos dias à frente a agenda fica aberta */
  maxAdvanceDays: z.number().int().min(1).max(180),
  /** Até quantos minutos antes o cliente pode cancelar/remarcar pelo link (0 = até a hora) */
  cancelMinAdvanceMinutes: z.number().int().min(0).max(60 * 72),
});
export type BarbershopSettingsInput = z.input<typeof barbershopSettingsSchema>;
