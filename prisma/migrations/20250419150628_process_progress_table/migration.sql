/*
  Warnings:

  - You are about to drop the column `stage` on the `ProcessProgress` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `ProcessProgress` table. All the data in the column will be lost.
  - Added the required column `process_stage` to the `ProcessProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ProcessProgress` DROP COLUMN `stage`,
    DROP COLUMN `timestamp`,
    ADD COLUMN `process_stage` VARCHAR(191) NOT NULL,
    ADD COLUMN `thread_stage` VARCHAR(191) NULL,
    MODIFY `thread_id` VARCHAR(191) NULL;
