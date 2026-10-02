BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Clients] ALTER COLUMN [mailing_state] CHAR(50) NULL;
ALTER TABLE [dbo].[Clients] ALTER COLUMN [billing_state] CHAR(50) NULL;

-- AlterTable
ALTER TABLE [dbo].[Sites] ALTER COLUMN [mailing_state] CHAR(50) NULL;

-- AlterTable
ALTER TABLE [dbo].[Vendors] ALTER COLUMN [mailing_state] CHAR(50) NULL;
ALTER TABLE [dbo].[Vendors] ALTER COLUMN [billing_state] CHAR(50) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
