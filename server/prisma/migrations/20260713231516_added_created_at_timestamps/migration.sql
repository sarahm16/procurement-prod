BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ClientContacts] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientContacts_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Clients_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[ClientServiceLines] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientServiceLines_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[ClientServiceLineSOWs] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [ClientServiceLineSOWs_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Companies] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Companies_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[ContactRoles] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [ContactRoles_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Contracts] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Contracts_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[ContractSites] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [ContractSites_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Notes] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Notes_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Roles] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Roles_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Sites] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Sites_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[VendorContractSites] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorContractSites_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[Vendors] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [Vendors_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[VendorServicePricing] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [VendorServicePricing_created_at_df] DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE [dbo].[WorkOrders] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrders_created_at_df] DEFAULT CURRENT_TIMESTAMP;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
