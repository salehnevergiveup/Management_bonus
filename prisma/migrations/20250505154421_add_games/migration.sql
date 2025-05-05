/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Bonus` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `game` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Match` ADD COLUMN `game` VARCHAR(191) NOT NULL,
    ADD COLUMN `turnover_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Bonus_name_key` ON `Bonus`(`name`);

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_turnover_id_fkey` FOREIGN KEY (`turnover_id`) REFERENCES `AccountTurnover`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
