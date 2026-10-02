/*
  Warnings:

  - Added the required column `vendor_id` to the `WorkOrderMSAs` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[WorkOrderMSAs] ADD [vendor_id] INT NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMSAs] ADD CONSTRAINT [WorkOrderMSAs_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
