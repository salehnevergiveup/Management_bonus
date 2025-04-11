/*
  Warnings:

  - Added the required column `process_id` to the `AccountTurnover` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `AccountTurnover` ADD COLUMN `process_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `AccountTurnover` ADD CONSTRAINT `AccountTurnover_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
