/*
  Warnings:

  - You are about to drop the `ProcessToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ProcessToken` DROP FOREIGN KEY `ProcessToken_process_id_fkey`;

-- DropTable
DROP TABLE `ProcessToken`;

-- CreateTable
CREATE TABLE `APIKey` (
    `id` VARCHAR(191) NOT NULL,
    `application` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `APIKey_application_key`(`application`),
    UNIQUE INDEX `APIKey_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
