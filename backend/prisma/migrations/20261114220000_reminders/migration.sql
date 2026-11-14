-- Lembrete do dia seguinte: quando o dono mandou o lembrete para cada cliente
ALTER TABLE "appointments" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- Aviso no celular do dono ("amanhã você tem N clientes"): hora e último dia enviado
ALTER TABLE "barbershops" ADD COLUMN     "reminderDigestHour" INTEGER DEFAULT 19,
ADD COLUMN     "reminderDigestOn" TEXT;
