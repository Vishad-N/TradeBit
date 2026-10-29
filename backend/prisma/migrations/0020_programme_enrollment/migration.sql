CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');
CREATE TYPE "EnrollmentSource" AS ENUM ('FREE_APPROVAL', 'PAYMENT');
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAID');

CREATE TABLE "ProgramEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "EnrollmentSource" NOT NULL,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "ProgramPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramEnrollment_userId_key" ON "ProgramEnrollment"("userId");
CREATE INDEX "ProgramEnrollment_status_idx" ON "ProgramEnrollment"("status");
CREATE UNIQUE INDEX "ProgramPayment_razorpayOrderId_key" ON "ProgramPayment"("razorpayOrderId");
CREATE UNIQUE INDEX "ProgramPayment_razorpayPaymentId_key" ON "ProgramPayment"("razorpayPaymentId");
CREATE INDEX "ProgramPayment_userId_idx" ON "ProgramPayment"("userId");

ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramPayment" ADD CONSTRAINT "ProgramPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
