
-- CreateTable
CREATE TABLE "service_photos" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_photos_serviceId_position_idx" ON "service_photos"("serviceId", "position");

-- AddForeignKey
ALTER TABLE "service_photos" ADD CONSTRAINT "service_photos_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_photos" ADD CONSTRAINT "service_photos_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

