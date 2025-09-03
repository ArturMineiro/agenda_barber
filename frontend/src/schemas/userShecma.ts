import { z } from "zod";

// Definição do schema de usuário
export const userSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  tipo: z.enum(["admin", "cliente"], {
    // 👇 aqui você só pode passar uma string simples
    error: "Tipo deve ser 'admin' ou 'cliente'",
  }),
});

// Para lista de usuários
export const usersSchema = z.array(userSchema);

// Tipos automáticos do schema (para usar no código)
export type User = z.infer<typeof userSchema>;
export type Users = z.infer<typeof usersSchema>;
