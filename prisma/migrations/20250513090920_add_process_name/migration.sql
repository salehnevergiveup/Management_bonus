/*
  Warnings:

  - You are about to drop the `match` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `match` DROP FOREIGN KEY `Match_bonus_id_fkey`;

-- DropForeignKey
ALTER TABLE `match` DROP FOREIGN KEY `Match_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `match` DROP FOREIGN KEY `Match_transfer_account_id_fkey`;

-- DropForeignKey
ALTER TABLE `match` DROP FOREIGN KEY `Match_turnover_id_fkey`;

-- AlterTable
ALTER TABLE `userprocess` ADD COLUMN `process_name` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `match`;

-- CreateTable
CREATE TABLE `matches` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `game` VARCHAR(191) NULL,
    `turnover_id` VARCHAR(191) NULL,
    `transfer_account_id` VARCHAR(191) NULL,
    `process_id` VARCHAR(191) NOT NULL,
    `bonus_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `matches_process_id_idx`(`process_id`),
    INDEX `matches_bonus_id_idx`(`bonus_id`),
    INDEX `matches_transfer_account_id_idx`(`transfer_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_turnover_id_fkey` FOREIGN KEY (`turnover_id`) REFERENCES `AccountTurnover`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_transfer_account_id_fkey` FOREIGN KEY (`transfer_account_id`) REFERENCES `TransferAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_bonus_id_fkey` FOREIGN KEY (`bonus_id`) REFERENCES `Bonus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
