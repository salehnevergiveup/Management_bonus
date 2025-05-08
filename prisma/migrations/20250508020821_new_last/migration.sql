/*
  Warnings:

  - You are about to drop the `TransferHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `TransferHistory` DROP FOREIGN KEY `TransferHistory_bonus_id_fkey`;

-- DropForeignKey
ALTER TABLE `TransferHistory` DROP FOREIGN KEY `TransferHistory_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `TransferHistory` DROP FOREIGN KEY `TransferHistory_transfer_account_id_fkey`;

-- DropTable
DROP TABLE `TransferHistory`;
