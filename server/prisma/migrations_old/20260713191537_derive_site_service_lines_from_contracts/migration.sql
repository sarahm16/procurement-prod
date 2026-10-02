/*
  Warnings:

  - You are about to drop the `SiteServiceLines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorSites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorSiteServiceLines` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[SiteServiceLines] DROP CONSTRAINT [FK__SiteServi__servi__4C6B5938];

-- DropForeignKey
ALTER TABLE [dbo].[SiteServiceLines] DROP CONSTRAINT [FK__SiteServi__site___4B7734FF];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSites] DROP CONSTRAINT [FK__VendorSit__site___503BEA1C];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSites] DROP CONSTRAINT [FK__VendorSit__vendo__4F47C5E3];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] DROP CONSTRAINT [FK__VendorSit__servi__55F4C372];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] DROP CONSTRAINT [FK__VendorSit__site___55009F39];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] DROP CONSTRAINT [FK__VendorSit__statu__56E8E7AB];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] DROP CONSTRAINT [FK__VendorSit__vendo__540C7B00];

-- DropTable
DROP TABLE [dbo].[SiteServiceLines];

-- DropTable
DROP TABLE [dbo].[VendorSites];

-- DropTable
DROP TABLE [dbo].[VendorSiteServiceLines];

-- CreateTable
CREATE TABLE [dbo].[VendorContractSites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [is_primary] BIT NOT NULL CONSTRAINT [VendorContractSites_is_primary_df] DEFAULT 0,
    [status_id] INT NOT NULL,
    [vendor_id] INT NOT NULL,
    [contract_site_id] INT NOT NULL,
    CONSTRAINT [VendorContractSites_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorContractSites_contract_site_id_idx] ON [dbo].[VendorContractSites]([contract_site_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorContractSites_vendor_id_idx] ON [dbo].[VendorContractSites]([vendor_id]);

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_contract_site_id_fkey] FOREIGN KEY ([contract_site_id]) REFERENCES [dbo].[ContractSites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[VendorSiteStatuses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
