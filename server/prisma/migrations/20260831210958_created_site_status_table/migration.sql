BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Sites] ADD [status_id] INT;

-- CreateTable
CREATE TABLE [dbo].[SiteStatuses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(30) NOT NULL,
    [description] VARCHAR(100),
    [color] VARCHAR(8),
    CONSTRAINT [SiteStatuses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Sites] ADD CONSTRAINT [Sites_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[SiteStatuses]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
