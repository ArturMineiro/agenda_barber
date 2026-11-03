-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('SCHEDULE', 'QUEUE');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELED');

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "bookingMode" "BookingMode" NOT NULL DEFAULT 'SCHEDULE';

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "queueOpen" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queue_entries_professionalId_status_joinedAt_idx" ON "queue_entries"("professionalId", "status", "joinedAt");

-- CreateIndex
CREATE INDEX "queue_entries_barbershopId_joinedAt_idx" ON "queue_entries"("barbershopId", "joinedAt");

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
