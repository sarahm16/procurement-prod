BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Vendors] ADD [contact_email] VARCHAR(100),
[contact_name] VARCHAR(100),
[contact_phone] VARCHAR(20),
[contact_phone2] VARCHAR(20),
[quickbooks_id] VARCHAR(100);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
