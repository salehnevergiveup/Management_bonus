/*
  Warnings:

  - You are about to drop the column `from_date` on the `usermatch` table. All the data in the column will be lost.
  - You are about to drop the column `process_name` on the `usermatch` table. All the data in the column will be lost.
  - You are about to drop the column `to_date` on the `usermatch` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `usermatch` table. All the data in the column will be lost.
  - You are about to drop the `matches` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `userMatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `userMatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `process_id` to the `userMatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `userMatch` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `accountturnover` DROP FOREIGN KEY `AccountTurnover_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `agentaccount` DROP FOREIGN KEY `agentAccount_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `matches_bonus_id_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `matches_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `matches_transfer_account_id_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `matches_turnover_id_fkey`;

-- DropForeignKey
ALTER TABLE `processprogress` DROP FOREIGN KEY `ProcessProgress_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `usermatch` DROP FOREIGN KEY `userMatch_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `userprocess_transferaccount` DROP FOREIGN KEY `UserProcess_TransferAccount_user_process_id_fkey`;

-- DropIndex
DROP INDEX `AccountTurnover_process_id_fkey` ON `accountturnover`;

-- DropIndex
DROP INDEX `agentAccount_process_id_fkey` ON `agentaccount`;

-- DropIndex
DROP INDEX `userMatch_status_idx` ON `usermatch`;

-- DropIndex
DROP INDEX `userMatch_user_id_idx` ON `usermatch`;

-- AlterTable
ALTER TABLE `usermatch` DROP COLUMN `from_date`,
    DROP COLUMN `process_name`,
    DROP COLUMN `to_date`,
    DROP COLUMN `user_id`,
    ADD COLUMN `amount` DOUBLE NOT NULL,
    ADD COLUMN `bonus_id` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL,
    ADD COLUMN `game` VARCHAR(191) NULL,
    ADD COLUMN `process_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `transfer_account_id` VARCHAR(191) NULL,
    ADD COLUMN `turnover_id` VARCHAR(191) NULL,
    ADD COLUMN `username` VARCHAR(191) NOT NULL,
    MODIFY `updated_at` DATETIME(3) NULL;

-- DropTable
DROP TABLE `matches`;

-- CreateTable
CREATE TABLE `UserProcess` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `from_date` DATETIME(3) NULL,
    `to_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `process_name` VARCHAR(191) NULL,

    INDEX `UserProcess_user_id_idx`(`user_id`),
    INDEX `UserProcess_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `userMatch_process_id_idx` ON `userMatch`(`process_id`);

-- CreateIndex
CREATE INDEX `userMatch_bonus_id_idx` ON `userMatch`(`bonus_id`);

-- CreateIndex
CREATE INDEX `userMatch_transfer_account_id_idx` ON `userMatch`(`transfer_account_id`);

-- AddForeignKey
ALTER TABLE `UserProcess` ADD CONSTRAINT `UserProcess_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessProgress` ADD CONSTRAINT `ProcessProgress_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProcess_TransferAccount` ADD CONSTRAINT `UserProcess_TransferAccount_user_process_id_fkey` FOREIGN KEY (`user_process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agentAccount` ADD CONSTRAINT `agentAccount_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTurnover` ADD CONSTRAINT `AccountTurnover_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userMatch` ADD CONSTRAINT `userMatch_turnover_id_fkey` FOREIGN KEY (`turnover_id`) REFERENCES `AccountTurnover`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userMatch` ADD CONSTRAINT `userMatch_transfer_account_id_fkey` FOREIGN KEY (`transfer_account_id`) REFERENCES `TransferAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userMatch` ADD CONSTRAINT `userMatch_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userMatch` ADD CONSTRAINT `userMatch_bonus_id_fkey` FOREIGN KEY (`bonus_id`) REFERENCES `Bonus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
