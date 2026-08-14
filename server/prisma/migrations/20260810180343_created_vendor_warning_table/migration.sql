BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VendorWarnings] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [notice_type] NVARCHAR(1000) NOT NULL,
    [pandadoc_id] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [sent_by] INT NOT NULL,
    [date_completed] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorWarnings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorWarnings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[VendorWarnings] ADD CONSTRAINT [VendorWarnings_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[VendorWarnings] ADD CONSTRAINT [VendorWarnings_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
