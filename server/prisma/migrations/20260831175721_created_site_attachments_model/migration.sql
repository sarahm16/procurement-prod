BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[SiteAttachments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [site_id] INT NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [blob_url] VARCHAR(500) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [content_type] VARCHAR(100),
    [uploaded_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [SiteAttachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SiteAttachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[SiteAttachments] ADD CONSTRAINT [SiteAttachments_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
