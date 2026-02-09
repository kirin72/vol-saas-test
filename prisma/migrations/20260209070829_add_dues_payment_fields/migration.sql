-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasPaidDues" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastPaidDate" TIMESTAMP(3);
