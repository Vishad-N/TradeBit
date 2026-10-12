-- CreateTable
CREATE TABLE "ProfitShot" (
    "id" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "caption" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitShot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfitShot_isActive_sortOrder_idx" ON "ProfitShot"("isActive", "sortOrder");
