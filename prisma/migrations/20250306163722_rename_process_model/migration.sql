/*
  Warnings:

  - You are about to drop the `Process` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ProcessToken` DROP FOREIGN KEY `ProcessToken_process_id_fkey`;

-- DropTable
DROP TABLE `Process`;

-- CreateTable
CREATE TABLE `UserProcess` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `start_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_time` DATETIME(3) NULL,
    `result` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `UserProcess_user_id_idx`(`user_id`),
    INDEX `UserProcess_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProcessToken` ADD CONSTRAINT `ProcessToken_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
