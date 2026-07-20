/*
  Warnings:

  - A unique constraint covering the columns `[contract_id,site_id]` on the table `ContractSites` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[ContractSites] ADD CONSTRAINT [ContractSites_contract_id_site_id_key] UNIQUE NONCLUSTERED ([contract_id], [site_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
