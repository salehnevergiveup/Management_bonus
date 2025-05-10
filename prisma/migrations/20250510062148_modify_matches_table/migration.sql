-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `Match_bonus_id_fkey`;

-- AlterTable
ALTER TABLE `Match` MODIFY `bonus_id` VARCHAR(191) NULL,
    MODIFY `game` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_bonus_id_fkey` FOREIGN KEY (`bonus_id`) REFERENCES `Bonus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
