-- CreateEnum
CREATE TYPE "ValidityUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR', 'LIFETIME');

-- CreateEnum
CREATE TYPE "CourseGrant" AS ENUM ('ADMIN', 'PAYMENT', 'TASK');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "allowPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowTask" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceInr" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taskDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "taskTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "validityUnit" "ValidityUnit" NOT NULL DEFAULT 'LIFETIME',
ADD COLUMN     "validityValue" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CourseEnrollment" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "source" "CourseGrant" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CoursePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CoursePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoursePayment_razorpayOrderId_key" ON "CoursePayment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePayment_razorpayPaymentId_key" ON "CoursePayment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "CoursePayment_userId_idx" ON "CoursePayment"("userId");

-- CreateIndex
CREATE INDEX "CoursePayment_courseId_idx" ON "CoursePayment"("courseId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_status_idx" ON "CourseEnrollment"("status");

-- AddForeignKey
ALTER TABLE "CoursePayment" ADD CONSTRAINT "CoursePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePayment" ADD CONSTRAINT "CoursePayment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing enrolments keep working exactly as before: ACTIVE, source ADMIN, no expiry. Record when they started.
UPDATE "CourseEnrollment" SET "activatedAt" = "createdAt" WHERE "activatedAt" IS NULL;
