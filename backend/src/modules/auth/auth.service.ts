import bcrypt from "bcryptjs";
import { RESERVED_SLUGS, type changePasswordSchema, type registerOwnerSchema, type loginSchema } from "@navalha/shared";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, unauthorized } from "../../lib/errors";
import { publicUserSelect } from "../../middlewares/auth";

type RegisterOwner = z.output<typeof registerOwnerSchema>;
type Login = z.output<typeof loginSchema>;

/** Seg–Sáb, 09:00–12:00 e 13:00–19:00 */
const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, startMinute: 9 * 60, endMinute: 12 * 60 },
  { weekday, startMinute: 13 * 60, endMinute: 19 * 60 },
]);

export async function isSlugAvailable(slug: string, ignoreBarbershopId?: string) {
  if (RESERVED_SLUGS.includes(slug)) return false;
  const existing = await prisma.barbershop.findUnique({ where: { slug }, select: { id: true } });
  return !existing || existing.id === ignoreBarbershopId;
}

/**
 * Cria o dono + barbearia PENDENTE já com um ponto de partida:
 * o próprio dono como profissional, grade padrão e dois serviços de exemplo.
 * Assim, quando o admin aprovar, a página já funciona.
 */
export async function registerOwner(input: RegisterOwner) {
  const emailTaken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (emailTaken) throw conflict("Este e-mail já está cadastrado", "EMAIL_TAKEN");
  if (!(await isSlugAvailable(input.barbershop.slug))) throw conflict("Este link já está em uso", "SLUG_TAKEN");

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email, phone: input.phone, passwordHash, role: "OWNER" },
      select: publicUserSelect,
    });

    const barbershop = await tx.barbershop.create({
      data: {
        ownerId: user.id,
        name: input.barbershop.name,
        slug: input.barbershop.slug,
        teamType: input.barbershop.teamType,
        bookingMode: input.barbershop.bookingMode,
        city: input.barbershop.city,
        phone: input.phone,
        whatsapp: input.phone,
      },
    });

    const [corte, barba] = await Promise.all([
      tx.service.create({
        data: { barbershopId: barbershop.id, name: "Corte", durationMinutes: 30, priceCents: 4000, position: 0 },
      }),
      tx.service.create({
        data: { barbershopId: barbershop.id, name: "Barba", durationMinutes: 30, priceCents: 3000, position: 1 },
      }),
    ]);

    await tx.professional.create({
      data: {
        barbershopId: barbershop.id,
        userId: user.id,
        name: input.name,
        services: { create: [{ serviceId: corte.id }, { serviceId: barba.id }] },
        workingHours: { create: DEFAULT_HOURS },
      },
    });

    return user;
  });
}

export async function changePassword(userId: string, input: z.output<typeof changePasswordSchema>) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw badRequest("Senha atual incorreta", "WRONG_PASSWORD");
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, 10) } });
}

export async function login(input: Login) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // mesma mensagem para e-mail inexistente e senha errada (não revela quem tem conta)
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized("E-mail ou senha incorretos");
  }
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}
