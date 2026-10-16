-- CreateTable
CREATE TABLE "TaskBook" (
    "taskId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskBook_pkey" PRIMARY KEY ("taskId","bookId")
);

-- Keep every existing task linked to the book it already unlocked
INSERT INTO "TaskBook" ("taskId", "bookId") SELECT "id", "bookId" FROM "Task";

-- CreateIndex
CREATE INDEX "TaskBook_bookId_idx" ON "TaskBook"("bookId");

-- AddForeignKey
ALTER TABLE "TaskBook" ADD CONSTRAINT "TaskBook_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskBook" ADD CONSTRAINT "TaskBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A task no longer has a single book
ALTER TABLE "Task" DROP CONSTRAINT "Task_bookId_fkey";
DROP INDEX "Task_bookId_idx";
ALTER TABLE "Task" DROP COLUMN "bookId";
