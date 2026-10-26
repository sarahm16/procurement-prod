BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[VendorWarnings] ADD [attachment_count] INT NOT NULL CONSTRAINT [VendorWarnings_attachment_count_df] DEFAULT 0,
[deadline] VARCHAR(100),
[photo_count] INT NOT NULL CONSTRAINT [VendorWarnings_photo_count_df] DEFAULT 0,
[resolution] VARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[VendorWarningContractSites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [warning_id] INT NOT NULL,
    [vendor_contract_site_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorWarningContractSites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorWarningContractSites_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorWarningContractSites_warning_id_vendor_contract_site_id_key] UNIQUE NONCLUSTERED ([warning_id],[vendor_contract_site_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorWarningContractSites_vendor_contract_site_id_idx] ON [dbo].[VendorWarningContractSites]([vendor_contract_site_id]);

-- AddForeignKey
ALTER TABLE [dbo].[VendorWarningContractSites] ADD CONSTRAINT [VendorWarningContractSites_warning_id_fkey] FOREIGN KEY ([warning_id]) REFERENCES [dbo].[VendorWarnings]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorWarningContractSites] ADD CONSTRAINT [VendorWarningContractSites_vendor_contract_site_id_fkey] FOREIGN KEY ([vendor_contract_site_id]) REFERENCES [dbo].[VendorContractSites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
