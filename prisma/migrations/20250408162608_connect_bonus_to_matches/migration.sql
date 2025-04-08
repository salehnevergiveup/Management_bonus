/*
  Warnings:

  - Added the required column `bonus_id` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Match` ADD COLUMN `bonus_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Match_bonus_id_idx` ON `Match`(`bonus_id`);

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_bonus_id_fkey` FOREIGN KEY (`bonus_id`) REFERENCES `Bonus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
