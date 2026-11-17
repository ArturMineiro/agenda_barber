import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter ao menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  WEB_URL: z.string().default("http://localhost:5173"),
  /** Quantos proxies confiáveis na frente da API (nginx da VPS + nginx do container = 2) */
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  /** WhatsApp do suporte/admin mostrado aos donos (só dígitos, com DDD) */
  /** Chaves do Web Push (gerar com: npx web-push generate-vapid-keys). Vazias = notificações desligadas */
  VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:suporte@navalha.app"),
  SUPPORT_WHATSAPP: z.string().default("").transform((v) => v.replace(/\D/g, "")),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:", z.treeifyError(parsed.error));
  console.error("   Copie backend/.env.example para backend/.env e ajuste.");
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
