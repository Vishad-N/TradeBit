-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ReadingAccess" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'TASK';

-- CreateTable
CREATE TABLE "MentorshipPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaid" DECIMAL(18,6) NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'TRC20',
    "txHash" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "screenshotKey" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MentorshipPayment_txHash_key" ON "MentorshipPayment"("txHash");

-- CreateIndex
CREATE INDEX "MentorshipPayment_userId_idx" ON "MentorshipPayment"("userId");

-- CreateIndex
CREATE INDEX "MentorshipPayment_status_idx" ON "MentorshipPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MentorshipAccess_userId_key" ON "MentorshipAccess"("userId");

-- AddForeignKey
ALTER TABLE "MentorshipPayment" ADD CONSTRAINT "MentorshipPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipAccess" ADD CONSTRAINT "MentorshipAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

