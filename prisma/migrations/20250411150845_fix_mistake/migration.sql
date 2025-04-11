/*
  Warnings:

  - You are about to alter the column `amount` on the `TransferHistory` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Double`.
  - You are about to alter the column `currency` on the `TransferHistory` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `TransferHistory` MODIFY `amount` DOUBLE NOT NULL,
    MODIFY `currency` VARCHAR(191) NOT NULL;
