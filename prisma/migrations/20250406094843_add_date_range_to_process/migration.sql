/*
  Warnings:

  - You are about to drop the column `end_time` on the `UserProcess` table. All the data in the column will be lost.
  - You are about to drop the column `start_time` on the `UserProcess` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `UserProcess` DROP COLUMN `end_time`,
    DROP COLUMN `start_time`,
    ADD COLUMN `from_date` DATETIME(3) NULL,
    ADD COLUMN `to_date` DATETIME(3) NULL;
