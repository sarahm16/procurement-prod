/*
  Warnings:

  - You are about to drop the column `internal_system_id` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `software_id` on the `Contracts` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_internal_system_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_software_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [software_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Contracts] DROP COLUMN [internal_system_id],
[software_id];

-- AddForeignKey
ALTER TABLE [dbo].[Clients] ADD CONSTRAINT [Clients_software_id_fkey] FOREIGN KEY ([software_id]) REFERENCES [dbo].[Softwares]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
