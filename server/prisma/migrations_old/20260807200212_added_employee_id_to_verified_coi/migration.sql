/*
  Warnings:

  - Made the column `verified_by` on table `VendorCOIs` required. This step will fail if there are existing NULL values in that column.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[VendorCOIs] ALTER COLUMN [verified_by] INT NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[VendorCOIs] ADD CONSTRAINT [VendorCOIs_verified_by_fkey] FOREIGN KEY ([verified_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
