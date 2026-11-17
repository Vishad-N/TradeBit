-- A refunded order is no longer simply "PAID".
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- Payment records are financial history: deleting a course or user must never silently erase them.
ALTER TABLE "CoursePayment" DROP CONSTRAINT "CoursePayment_userId_fkey";
ALTER TABLE "CoursePayment" DROP CONSTRAINT "CoursePayment_courseId_fkey";
ALTER TABLE "CoursePayment" ADD CONSTRAINT "CoursePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePayment" ADD CONSTRAINT "CoursePayment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
