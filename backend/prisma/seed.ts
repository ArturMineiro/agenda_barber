/**
 * Seed: cria o super admin e os planos base.
 * Idempotente — pode rodar várias vezes.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANS = [
  {
    name: "Solo",
    description: "Para o barbeiro que trabalha sozinho. Agenda online, link próprio e lembretes.",
    priceCents: 5990,
    maxProfessionals: 1,
  },
  {
    name: "Equipe",
    description: "Barbearias com até 5 profissionais. Agenda por profissional e relatórios.",
    priceCents: 10990,
    maxProfessionals: 5,
  },
  {
    name: "Premium",
    description: "Profissionais ilimitados e suporte prioritário.",
    priceCents: 18990,
    maxProfessionals: null,
  },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@navalha.app";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrador",
      email,
      role: "SUPER_ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`👑 Super admin: ${email} / ${password}`);

  for (const plan of PLANS) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (!existing) await prisma.plan.create({ data: plan });
  }
  console.log(`📦 Planos: ${PLANS.map((p) => p.name).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
