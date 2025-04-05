/*
  Warnings:

  - You are about to drop the column `player_id` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `UserProcess` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `UserProcess` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Match` DROP FOREIGN KEY `Match_player_id_fkey`;

-- DropIndex
DROP INDEX `Match_player_id_idx` ON `Match`;

-- AlterTable
ALTER TABLE `Match` DROP COLUMN `player_id`,
    ADD COLUMN `transfer_account_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TransferAccount` ADD COLUMN `process_id` VARCHAR(191) NULL,
    ADD COLUMN `progress` INTEGER NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'no process';

-- AlterTable
ALTER TABLE `UserProcess` DROP COLUMN `progress`,
    DROP COLUMN `result`,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE `agentAccount` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'no process',
    `progress` INTEGER NULL,
    `process_id` VARCHAR(191) NULL,

    UNIQUE INDEX `agentAccount_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TransferAccount` ADD CONSTRAINT `TransferAccount_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agentAccount` ADD CONSTRAINT `agentAccount_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_transfer_account_id_fkey` FOREIGN KEY (`transfer_account_id`) REFERENCES `TransferAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
