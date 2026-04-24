/*
  Warnings:

  - A unique constraint covering the columns `[ms_user_id]` on the table `Employees` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [Employees_ms_user_id_key] UNIQUE NONCLUSTERED ([ms_user_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
