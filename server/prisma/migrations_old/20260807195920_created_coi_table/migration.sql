BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VendorCOIs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_id] INT NOT NULL,
    [blob_url] VARCHAR(500) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [expiration_date] DATETIME2 NOT NULL,
    [additionally_insured_verified] BIT NOT NULL CONSTRAINT [VendorCOIs_additionally_insured_verified_df] DEFAULT 0,
    [verified_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorCOIs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorCOIs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[VendorCOIs] ADD CONSTRAINT [VendorCOIs_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
