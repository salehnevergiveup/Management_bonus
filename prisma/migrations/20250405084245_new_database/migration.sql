/*
  Warnings:

  - You are about to drop the column `account_username` on the `TransferAccount` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_account` on the `TransferAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `TransferAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `TransferAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `TransferAccount_account_username_key` ON `TransferAccount`;

-- AlterTable
ALTER TABLE `TransferAccount` DROP COLUMN `account_username`,
    DROP COLUMN `transfer_account`,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'sub_account',
    ADD COLUMN `username` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `TransferAccount_username_key` ON `TransferAccount`(`username`);
