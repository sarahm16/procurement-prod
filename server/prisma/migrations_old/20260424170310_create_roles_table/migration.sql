/*
  Warnings:

  - Added the required column `role_id` to the `Employees` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `Employees` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Employees` required. This step will fail if there are existing NULL values in that column.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Employees] ALTER COLUMN [name] VARCHAR(100) NOT NULL;
ALTER TABLE [dbo].[Employees] ALTER COLUMN [email] VARCHAR(100) NOT NULL;
ALTER TABLE [dbo].[Employees] ADD [role_id] INT NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [description] VARCHAR(100),
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [Employees_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
