-- CreateTable
CREATE TABLE `ImportFailure` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `import_session_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `account` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportFailure_user_id_idx`(`user_id`),
    INDEX `ImportFailure_import_session_id_idx`(`import_session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImportFailure` ADD CONSTRAINT `ImportFailure_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
