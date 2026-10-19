-- AlterTable
ALTER TABLE "Book" ADD COLUMN "clubOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FreeReadingSchedule" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "days" INTEGER[],
    "startMinute" INTEGER NOT NULL DEFAULT 0,
    "endMinute" INTEGER NOT NULL DEFAULT 1440,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "allBooks" BOOLEAN NOT NULL DEFAULT true,
    "bookIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeReadingSchedule_pkey" PRIMARY KEY ("id")
);
