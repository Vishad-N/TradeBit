-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "quote" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 5,
    "videoUrl" TEXT,
    "duration" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Testimonial_kind_isActive_sortOrder_idx" ON "Testimonial"("kind", "isActive", "sortOrder");
