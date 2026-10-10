-- CreateTable
CREATE TABLE "WebinarRegistration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT,
    "source" TEXT NOT NULL DEFAULT 'page',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebinarRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebinarRegistration_createdAt_idx" ON "WebinarRegistration"("createdAt");

-- CreateIndex
CREATE INDEX "WebinarRegistration_email_idx" ON "WebinarRegistration"("email");
