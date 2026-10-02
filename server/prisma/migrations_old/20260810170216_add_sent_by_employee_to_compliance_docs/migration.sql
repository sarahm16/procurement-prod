BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[VendorComplianceDocuments] ADD [sent_by] INT;

-- AddForeignKey
ALTER TABLE [dbo].[VendorComplianceDocuments] ADD CONSTRAINT [VendorComplianceDocuments_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
