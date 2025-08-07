-- CreateTable
CREATE TABLE `SmsSendLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `endpoint_name` VARCHAR(191) NOT NULL,
    `total_sent` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SmsSendLog_endpoint_name_idx`(`endpoint_name`),
    INDEX `SmsSendLog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
