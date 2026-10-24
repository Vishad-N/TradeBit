CREATE TYPE "AccessSource" AS ENUM ('TASK', 'MENTORSHIP');

UPDATE "ReadingAccess" SET "source" = 'TASK' WHERE "source" NOT IN ('TASK', 'MENTORSHIP');

ALTER TABLE "ReadingAccess" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "ReadingAccess" ALTER COLUMN "source" TYPE "AccessSource" USING ("source"::"AccessSource");
ALTER TABLE "ReadingAccess" ALTER COLUMN "source" SET DEFAULT 'TASK';
