-- CreateTable
CREATE TABLE `UserProcess_TransferAccount` (
    `user_process_id` VARCHAR(191) NOT NULL,
    `transfer_account_id` VARCHAR(191) NOT NULL,
    `transfer_status` VARCHAR(191) NOT NULL DEFAULT 'pending',

    INDEX `UserProcess_TransferAccount_transfer_status_idx`(`transfer_status`),
    PRIMARY KEY (`user_process_id`, `transfer_account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserProcess_TransferAccount` ADD CONSTRAINT `UserProcess_TransferAccount_user_process_id_fkey` FOREIGN KEY (`user_process_id`) REFERENCES `UserProcess`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProcess_TransferAccount` ADD CONSTRAINT `UserProcess_TransferAccount_transfer_account_id_fkey` FOREIGN KEY (`transfer_account_id`) REFERENCES `TransferAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
