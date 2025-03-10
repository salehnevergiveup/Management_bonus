/*
  Warnings:

  - Added the required column `transfer_account` to the `TransferAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TransferAccount` ADD COLUMN `transfer_account` VARCHAR(191) NOT NULL;
