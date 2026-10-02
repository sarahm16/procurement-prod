/*
  Warnings:

  - You are about to drop the column `ms_user_id` on the `Notes` table. All the data in the column will be lost.
  - Added the required column `author_id` to the `Notes` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Notes] DROP CONSTRAINT [Notes_ms_user_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Notes] DROP COLUMN [ms_user_id];
ALTER TABLE [dbo].[Notes] ADD [author_id] INT NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[Notes] ADD CONSTRAINT [Notes_author_id_fkey] FOREIGN KEY ([author_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
