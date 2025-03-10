/*
  Warnings:

  - A unique constraint covering the columns `[account_username]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Player_account_username_key` ON `Player`(`account_username`);
