-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('CHANGE', 'DELETE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "availableThisMonth" BOOLEAN,
ADD COLUMN     "preferredDays" JSONB,
ADD COLUMN     "unavailableDates" JSONB,
ADD COLUMN     "unavailableDays" JSONB;

-- CreateTable
CREATE TABLE "assignment_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_requests_organizationId_idx" ON "assignment_requests"("organizationId");

-- CreateIndex
CREATE INDEX "assignment_requests_userId_idx" ON "assignment_requests"("userId");

-- CreateIndex
CREATE INDEX "assignment_requests_assignmentId_idx" ON "assignment_requests"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_requests_status_idx" ON "assignment_requests"("status");

-- AddForeignKey
ALTER TABLE "assignment_requests" ADD CONSTRAINT "assignment_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_requests" ADD CONSTRAINT "assignment_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
