/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ProcessToken` table. All the data in the column will be lost.
  - Added the required column `process_id` to the `ProcessToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ProcessToken` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `process_id` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `Process` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `start_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_time` DATETIME(3) NULL,
    `result` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Process_user_id_idx`(`user_id`),
    INDEX `Process_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ProcessToken_process_id_idx` ON `ProcessToken`(`process_id`);

-- AddForeignKey
ALTER TABLE `ProcessToken` ADD CONSTRAINT `ProcessToken_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `Process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
