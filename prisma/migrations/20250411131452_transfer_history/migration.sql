-- CreateTable
CREATE TABLE `TransferHistory` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `process_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'failed',
    `amount` VARCHAR(191) NOT NULL,
    `currency` DOUBLE NOT NULL,
    `transfer_account_id` VARCHAR(191) NULL,
    `bonus_id` VARCHAR(191) NOT NULL,
    `date_from` DATETIME(3) NOT NULL,
    `date_to` DATETIME(3) NOT NULL,
    `terminated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TransferHistory_process_id_idx`(`process_id`),
    INDEX `TransferHistory_bonus_id_idx`(`bonus_id`),
    INDEX `TransferHistory_transfer_account_id_idx`(`transfer_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TransferHistory` ADD CONSTRAINT `TransferHistory_transfer_account_id_fkey` FOREIGN KEY (`transfer_account_id`) REFERENCES `TransferAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferHistory` ADD CONSTRAINT `TransferHistory_process_id_fkey` FOREIGN KEY (`process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferHistory` ADD CONSTRAINT `TransferHistory_bonus_id_fkey` FOREIGN KEY (`bonus_id`) REFERENCES `Bonus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Match` RENAME INDEX `Match_transfer_account_id_fkey` TO `Match_transfer_account_id_idx`;
