BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[WorkOrderCommunications] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [content] VARCHAR(2000) NOT NULL,
    [sender_type] NVARCHAR(1000) NOT NULL,
    [employee_id] INT,
    [vendor_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderCommunications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkOrderCommunications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderCommunications_work_order_id_idx] ON [dbo].[WorkOrderCommunications]([work_order_id]);

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_employee_id_fkey] FOREIGN KEY ([employee_id]) REFERENCES [dbo].[Employees]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
