BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[VendorWarnings] ADD [impact] VARCHAR(1000),
[msa_last_updated] DATE,
[penalty_amount] DECIMAL(10,2),
[penalty_reason] VARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
