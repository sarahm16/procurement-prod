/*
  Warnings:

  - You are about to drop the column `project_manager_id` on the `Contracts` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_project_manager_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [account_manager_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Contracts] DROP COLUMN [project_manager_id];

-- AddForeignKey
ALTER TABLE [dbo].[Clients] ADD CONSTRAINT [Clients_account_manager_id_fkey] FOREIGN KEY ([account_manager_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
