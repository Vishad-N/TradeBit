-- A deleted task is archived, not erased: its requests and the access they granted stay.
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Requests must never cascade away with their task.
ALTER TABLE "TaskSubmission" DROP CONSTRAINT "TaskSubmission_taskId_fkey";
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
