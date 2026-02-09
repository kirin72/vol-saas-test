-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('NONE', 'MALE_PREFERRED', 'FEMALE_PREFERRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gender" "Gender";

-- AlterTable
ALTER TABLE "volunteer_roles" ADD COLUMN     "genderPreference" "GenderPreference" NOT NULL DEFAULT 'NONE';
