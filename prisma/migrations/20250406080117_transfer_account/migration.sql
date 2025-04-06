-- AlterTable
ALTER TABLE `TransferAccount` ADD COLUMN `parent_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `TransferAccount` ADD CONSTRAINT `TransferAccount_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `TransferAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
