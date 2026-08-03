BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VendorComplianceDocuments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [document_type] NVARCHAR(1000) NOT NULL,
    [pandadoc_id] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [date_completed] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorComplianceDocuments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorComplianceDocuments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[VendorComplianceDocuments] ADD CONSTRAINT [VendorComplianceDocuments_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
