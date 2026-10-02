/*
  Warnings:

  - You are about to drop the column `contact_role` on the `ClientContacts` table. All the data in the column will be lost.
  - Added the required column `contact_role_id` to the `ClientContacts` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[ClientContacts] DROP CONSTRAINT [ClientContacts_contact_role_fkey];

-- AlterTable
ALTER TABLE [dbo].[ClientContacts] DROP COLUMN [contact_role];
ALTER TABLE [dbo].[ClientContacts] ADD [contact_role_id] INT NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [sandbox] BIT NOT NULL CONSTRAINT [Clients_sandbox_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Sites] ADD [sandbox] BIT NOT NULL CONSTRAINT [Sites_sandbox_df] DEFAULT 0;

-- AddForeignKey
ALTER TABLE [dbo].[ClientContacts] ADD CONSTRAINT [ClientContacts_contact_role_id_fkey] FOREIGN KEY ([contact_role_id]) REFERENCES [dbo].[ContactRoles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
