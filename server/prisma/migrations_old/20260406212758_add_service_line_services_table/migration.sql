BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ServiceLineServices] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [service_line_id] INT NOT NULL,
    CONSTRAINT [ServiceLineServices_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineServices] ADD CONSTRAINT [ServiceLineServices_service_line_id_fkey] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
