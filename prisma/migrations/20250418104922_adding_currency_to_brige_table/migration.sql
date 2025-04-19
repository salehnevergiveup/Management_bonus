/*
  Warnings:

  - The primary key for the `UserProcess_TransferAccount` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `currency` to the `UserProcess_TransferAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `UserProcess_TransferAccount` DROP PRIMARY KEY,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`user_process_id`, `transfer_account_id`, `currency`);
