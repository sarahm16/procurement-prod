/*
  Warnings:

  - Added the required column `project_name` to the `Contracts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Contracts` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Contracts] ADD [operations_person_id] INT,
[project_manager_id] INT,
[project_name] NVARCHAR(1000) NOT NULL,
[sales_person_id] INT,
[value] DECIMAL(32,16) NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_project_manager_id_fkey] FOREIGN KEY ([project_manager_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_sales_person_id_fkey] FOREIGN KEY ([sales_person_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_operations_person_id_fkey] FOREIGN KEY ([operations_person_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
