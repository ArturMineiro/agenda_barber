-- CreateEnum
CREATE TYPE "PageTheme" AS ENUM ('LIGHT', 'DARK');


-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "pageTheme" "PageTheme" NOT NULL DEFAULT 'LIGHT';

