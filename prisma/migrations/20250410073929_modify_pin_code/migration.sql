/*
  Warnings:

  - You are about to drop the column `PIN` on the `TransferAccount` table. All the data in the column will be lost.
  - Added the required column `pin_code` to the `TransferAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TransferAccount` DROP COLUMN `PIN`,
    ADD COLUMN `pin_code` VARCHAR(191) NOT NULL;
