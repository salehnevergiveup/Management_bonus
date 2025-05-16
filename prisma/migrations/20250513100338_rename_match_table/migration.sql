/*
  Warnings:

  - You are about to drop the `userprocess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `accountturnover` DROP FOREIGN KEY `AccountTurnover_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `agentaccount` DROP FOREIGN KEY `agentAccount_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `matches` DROP FOREIGN KEY `matches_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `processprogress` DROP FOREIGN KEY `ProcessProgress_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `userprocess` DROP FOREIGN KEY `UserProcess_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `userprocess_transferaccount` DROP FOREIGN KEY `UserProcess_TransferAccount_user_process_id_fkey`;

-- DropIndex
DROP INDEX `AccountTurnover_process_id_fkey` ON `accountturnover`;

-- DropIndex
DROP INDEX `agentAccount_process_id_fkey` ON `agentaccount`;

-- DropTable
DROP TABLE `userprocess`;

-- CreateTable
CREATE TABLE `userMatch` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `from_date` DATETIME(3) NULL,
    `to_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `process_name` VARCHAR(191) NULL,

    INDEX `userMatch_user_id_idx`(`user_id`),
    INDEX `userMatch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `userMatch` ADD CONSTRAINT `userMatch_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessProgress` ADD CONSTRAINT `ProcessProgress_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `userMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProcess_TransferAccount` ADD CONSTRAINT `UserProcess_TransferAccount_user_process_id_fkey` FOREIGN KEY (`user_process_id`) REFERENCES `userMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agentAccount` ADD CONSTRAINT `agentAccount_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `userMatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountTurnover` ADD CONSTRAINT `AccountTurnover_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `userMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `userMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
