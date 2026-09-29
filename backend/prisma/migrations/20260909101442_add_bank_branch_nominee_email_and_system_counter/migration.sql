/*
  Warnings:

  - Added the required column `updated_at` to the `nominees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "member_bank_details" ADD COLUMN     "branch" TEXT;

-- AlterTable
ALTER TABLE "nominees" ADD COLUMN     "email" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
