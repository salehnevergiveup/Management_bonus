/*
  Warnings:

  - You are about to drop the column `json` on the `ProcessProgress` table. All the data in the column will be lost.
  - Added the required column `data` to the `ProcessProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ProcessProgress` DROP COLUMN `json`,
    ADD COLUMN `data` JSON NOT NULL;
