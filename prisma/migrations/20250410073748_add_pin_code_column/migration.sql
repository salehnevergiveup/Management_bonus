/*
  Warnings:

  - Added the required column `PIN` to the `TransferAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TransferAccount` ADD COLUMN `PIN` VARCHAR(191) NOT NULL;
