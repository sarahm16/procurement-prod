/*
  Warnings:

  - You are about to drop the column `pm_id` on the `WorkOrderServices` table. All the data in the column will be lost.
  - Made the column `status_id` on table `Vendors` required. This step will fail if there are existing NULL values in that column.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[WorkOrderServices] DROP CONSTRAINT [FK__WorkOrder__pm_id__662B2B3B];

-- AlterTable
ALTER TABLE [dbo].[Vendors] ALTER COLUMN [status_id] INT NOT NULL;
ALTER TABLE [dbo].[Vendors] ADD [sandbox] BIT NOT NULL CONSTRAINT [Vendors_sandbox_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[WorkOrderServices] DROP COLUMN [pm_id];

-- CreateTable
CREATE TABLE [dbo].[Contracts] (
    [id] INT NOT NULL IDENTITY(1,1),
    [start_date] DATETIME NOT NULL CONSTRAINT [Contracts_start_date_df] DEFAULT CURRENT_TIMESTAMP,
    [end_date] DATETIME,
    [auto_renew] BIT NOT NULL CONSTRAINT [Contracts_auto_renew_df] DEFAULT 0,
    [annual_increase_percent] DECIMAL(32,16),
    [client_id] INT NOT NULL,
    [service_line_id] INT NOT NULL,
    [software_id] INT,
    CONSTRAINT [Contracts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceTypes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(300),
    CONSTRAINT [ServiceTypes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContractSites] (
    [id] INT NOT NULL IDENTITY(1,1),
    [high_risk] BIT NOT NULL CONSTRAINT [ContractSites_high_risk_df] DEFAULT 0,
    [site_id] INT NOT NULL,
    [contract_id] INT NOT NULL,
    CONSTRAINT [ContractSites_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContractSiteServices] (
    [id] INT NOT NULL IDENTITY(1,1),
    [client_price] DECIMAL(32,16) NOT NULL CONSTRAINT [ContractSiteServices_client_price_df] DEFAULT 0,
    [contract_site_id] INT NOT NULL,
    [service_type_id] INT NOT NULL,
    [service_line_service_id] INT NOT NULL,
    CONSTRAINT [ContractSiteServices_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VendorServicePricing] (
    [id] INT NOT NULL IDENTITY(1,1),
    [vendor_price] DECIMAL(32,16) NOT NULL,
    [contract_site_service_id] INT NOT NULL,
    [vendor_id] INT NOT NULL,
    CONSTRAINT [VendorServicePricing_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorServicePricing_contract_site_service_id_key] UNIQUE NONCLUSTERED ([contract_site_service_id])
);

-- RenameForeignKey
EXEC sp_rename 'dbo.FK__WorkOrder__proje__5F7E2DAC', 'WorkOrders_project_manager_id_fkey', 'OBJECT';

-- RenameForeignKey
EXEC sp_rename 'dbo.FK__WorkOrder__sourc__607251E5', 'WorkOrders_sourcer_id_fkey', 'OBJECT';

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_service_line_id_fkey] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_client_id_fkey] FOREIGN KEY ([client_id]) REFERENCES [dbo].[Clients]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_software_id_fkey] FOREIGN KEY ([software_id]) REFERENCES [dbo].[Softwares]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSites] ADD CONSTRAINT [ContractSites_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSites] ADD CONSTRAINT [ContractSites_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contracts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSiteServices] ADD CONSTRAINT [ContractSiteServices_contract_site_id_fkey] FOREIGN KEY ([contract_site_id]) REFERENCES [dbo].[ContractSites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSiteServices] ADD CONSTRAINT [ContractSiteServices_service_type_id_fkey] FOREIGN KEY ([service_type_id]) REFERENCES [dbo].[ServiceTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSiteServices] ADD CONSTRAINT [ContractSiteServices_service_line_service_id_fkey] FOREIGN KEY ([service_line_service_id]) REFERENCES [dbo].[ServiceLineServices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorServicePricing] ADD CONSTRAINT [VendorServicePricing_contract_site_service_id_fkey] FOREIGN KEY ([contract_site_service_id]) REFERENCES [dbo].[ContractSiteServices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorServicePricing] ADD CONSTRAINT [VendorServicePricing_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
