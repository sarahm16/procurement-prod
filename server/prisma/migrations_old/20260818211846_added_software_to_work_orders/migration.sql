BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[WorkOrders] ADD [software_id] INT;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_software_id_fkey] FOREIGN KEY ([software_id]) REFERENCES [dbo].[Softwares]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
