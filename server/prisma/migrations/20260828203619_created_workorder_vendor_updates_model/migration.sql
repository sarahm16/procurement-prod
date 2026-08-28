BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[WorkOrderVendorUpdates] (
    [id] INT NOT NULL IDENTITY(1,1),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderVendorUpdates_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [check_in] DATETIME2,
    [check_in_notes] VARCHAR(1000),
    [check_out] DATETIME2,
    [check_out_notes] VARCHAR(1000),
    [vendor_id] INT NOT NULL,
    [work_order_id] INT NOT NULL,
    CONSTRAINT [WorkOrderVendorUpdates_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WorkOrderVendorUpdates_work_order_id_vendor_id_key] UNIQUE NONCLUSTERED ([work_order_id],[vendor_id])
);

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderVendorUpdates] ADD CONSTRAINT [WorkOrderVendorUpdates_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderVendorUpdates] ADD CONSTRAINT [WorkOrderVendorUpdates_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
