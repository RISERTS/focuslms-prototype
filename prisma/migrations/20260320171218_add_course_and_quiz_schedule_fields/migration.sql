-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseCode" TEXT,
ADD COLUMN     "program" TEXT,
ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "attemptTimeLimitMinutes" INTEGER,
ADD COLUMN     "closesAt" TIMESTAMP(3),
ADD COLUMN     "opensAt" TIMESTAMP(3);
