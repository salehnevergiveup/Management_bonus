/*
  Warnings:

  - You are about to drop the column `commit` on the `userMatch` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `userMatch` DROP COLUMN `commit`,
    ADD COLUMN `comment` VARCHAR(191) NULL;
