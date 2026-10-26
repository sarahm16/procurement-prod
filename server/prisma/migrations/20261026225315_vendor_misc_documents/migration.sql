BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VendorDocuments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [blob_path] VARCHAR(500) NOT NULL,
    [blob_url] VARCHAR(1000) NOT NULL,
    [content_type] VARCHAR(150) NOT NULL,
    [size_bytes] INT NOT NULL,
    [notes] VARCHAR(1000),
    [uploaded_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorDocuments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [deleted_at] DATETIME2,
    [deleted_by] INT,
    CONSTRAINT [VendorDocuments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorDocuments_vendor_id_deleted_at_idx] ON [dbo].[VendorDocuments]([vendor_id], [deleted_at]);

-- AddForeignKey
ALTER TABLE [dbo].[VendorDocuments] ADD CONSTRAINT [VendorDocuments_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorDocuments] ADD CONSTRAINT [VendorDocuments_uploaded_by_fkey] FOREIGN KEY ([uploaded_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorDocuments] ADD CONSTRAINT [VendorDocuments_deleted_by_fkey] FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
