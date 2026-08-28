BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[WorkOrderAttachments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [blob_url] VARCHAR(500) NOT NULL,
    [file_name] VARCHAR(255) NOT NULL,
    [content_type] VARCHAR(100),
    [uploaded_by] INT,
    [uploaded_by_vendor] BIT NOT NULL CONSTRAINT [WorkOrderAttachments_uploaded_by_vendor_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderAttachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkOrderAttachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderAttachments] ADD CONSTRAINT [WorkOrderAttachments_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
