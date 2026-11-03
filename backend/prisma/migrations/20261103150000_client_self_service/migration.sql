-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "accessToken" TEXT NOT NULL DEFAULT replace((gen_random_uuid())::text, '-', ''),
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledBy" TEXT,
ADD COLUMN     "rescheduleCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "cancelMinAdvanceMinutes" INTEGER NOT NULL DEFAULT 120;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_accessToken_key" ON "appointments"("accessToken");

