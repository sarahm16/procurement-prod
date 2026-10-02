BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[ContractSiteServices] DROP CONSTRAINT [ContractSiteServices_service_type_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [tax_treatment] VARCHAR(30) NOT NULL CONSTRAINT [Clients_tax_treatment_df] DEFAULT 'Billed separately';

-- AlterTable
ALTER TABLE [dbo].[Contracts] ADD [service_type_id] INT;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_service_type_id_fkey] FOREIGN KEY ([service_type_id]) REFERENCES [dbo].[ServiceTypes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
