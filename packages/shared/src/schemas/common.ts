import { z } from "zod";

export const idSchema = z.string().min(1);

/** Nome de pessoa, barbearia ou serviço: curto o bastante para caber em listas, notificações e no card de prévia */
export const nameSchema = (required: string, max = 80) => z.string().trim().min(2, required).max(max, `Máximo de ${max} caracteres`);

/** bcrypt só considera os primeiros 72 bytes */
export const passwordSchema = z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72, "Máximo de 72 caracteres");

const digits = (v: string) => v.replace(/\D/g, "");

/** Telefone brasileiro: aceita com ou sem máscara, guarda só dígitos */
export const phoneSchema = z
  .string()
  .trim()
  .transform(digits)
  .refine((v) => v.length >= 10 && v.length <= 13, "Telefone inválido");

/** Telefone opcional: string vazia vira null */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform(digits)
  .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "Telefone inválido")
  .transform((v) => (v === "" ? null : v))
  .nullish();

/** Identificador do link público: minúsculas, números e hífen */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo de 3 caracteres")
  .max(40, "Máximo de 40 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífen");

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

/** URL opcional: string vazia vira null */
export const optionalUrlSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/.+/.test(v), "URL inválida")
  .transform((v) => (v === "" ? null : v))
  .nullish();

/** Texto opcional: string vazia vira null */
export const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullish();

/** "YYYY-MM-DD" */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

/** Minutos desde a meia-noite (0 – 1440) */
export const minuteOfDaySchema = z.number().int().min(0).max(1440);

/** Valor em centavos */
export const centsSchema = z.number().int().min(0);

/** Slugs que não podem ser usados porque colidem com rotas do sistema */
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "app",
  "painel",
  "login",
  "cadastro",
  "entrar",
  "sair",
  "b",
  "agendamento",
  "static",
  "assets",
];

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Imagem: arquivo enviado (/uploads/...) ou URL externa; string vazia vira null */
export const optionalImageSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/.+/.test(v) || /^\/uploads\/[\w\-/.]+$/.test(v), "Imagem inválida")
  .transform((v) => (v === "" ? null : v))
  .nullish();
