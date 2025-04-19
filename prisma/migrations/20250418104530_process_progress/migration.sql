/*
  Warnings:

  - You are about to drop the column `process_id` on the `TransferAccount` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `TransferAccount` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `TransferAccount` DROP FOREIGN KEY `TransferAccount_process_id_fkey`;

-- DropIndex
DROP INDEX `TransferAccount_process_id_fkey` ON `TransferAccount`;

-- AlterTable
ALTER TABLE `TransferAccount` DROP COLUMN `process_id`,
    DROP COLUMN `progress`;

-- AlterTable
ALTER TABLE `UserProcess_TransferAccount` ADD COLUMN `progress` INTEGER NULL;

-- CreateTable
CREATE TABLE `ProcessProgress` (
    `id` VARCHAR(191) NOT NULL,
    `process_id` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `json` JSON NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `event_name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,

    INDEX `ProcessProgress_process_id_idx`(`process_id`),
    INDEX `ProcessProgress_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProcessProgress` ADD CONSTRAINT `ProcessProgress_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
