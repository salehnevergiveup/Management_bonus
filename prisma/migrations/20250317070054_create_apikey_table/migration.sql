-- CreateTable
CREATE TABLE `APIKeyPermission` (
    `apikey_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,

    INDEX `APIKeyPermission_apikey_id_idx`(`apikey_id`),
    INDEX `APIKeyPermission_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`apikey_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `APIKeyPermission` ADD CONSTRAINT `APIKeyPermission_apikey_id_fkey` FOREIGN KEY (`apikey_id`) REFERENCES `APIKey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `APIKeyPermission` ADD CONSTRAINT `APIKeyPermission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
