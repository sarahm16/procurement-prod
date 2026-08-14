/*
  Warnings:

  - You are about to drop the column `status` on the `WorkOrders` table. All the data in the column will be lost.
  - You are about to drop the column `trade_id` on the `WorkOrders` table. All the data in the column will be lost.
  - You are about to drop the column `service` on the `WorkOrderServices` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `WorkOrderServices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[work_order_number]` on the table `WorkOrders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `created_by_email` to the `WorkOrders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status_id` to the `WorkOrders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `work_order_number` to the `WorkOrders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trade_id` to the `WorkOrderServices` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[WorkOrders] DROP CONSTRAINT [FK__WorkOrder__trade__5D95E53A];

-- DropForeignKey
ALTER TABLE [dbo].[WorkOrderServices] DROP CONSTRAINT [FK__WorkOrder__vendo__65370702];

-- AlterTable
ALTER TABLE [dbo].[WorkOrders] DROP COLUMN [status],
[trade_id];
ALTER TABLE [dbo].[WorkOrders] ADD [created_by_email] VARCHAR(100) NOT NULL,
[msa_id] INT,
[parent_work_order_id] INT,
[status_id] INT NOT NULL,
[vendor_id] INT,
[work_order_number] VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[WorkOrderServices] DROP COLUMN [service],
[vendor_id];
ALTER TABLE [dbo].[WorkOrderServices] ADD [trade_id] INT NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[WorkOrderStatuses] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(30) NOT NULL,
    [description] VARCHAR(100),
    CONSTRAINT [WorkOrderStatuses_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkOrderMSAs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [work_order_id] INT NOT NULL,
    [pandadoc_id] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [date_sent] DATETIME2,
    [date_completed] DATETIME2,
    [sent_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkOrderMSAs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkOrderMSAs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_work_order_number_key] UNIQUE NONCLUSTERED ([work_order_number]);

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_parent_work_order_id_fkey] FOREIGN KEY ([parent_work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_status_id_fkey] FOREIGN KEY ([status_id]) REFERENCES [dbo].[WorkOrderStatuses]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [WorkOrders_vendor_id_fkey] FOREIGN KEY ([vendor_id]) REFERENCES [dbo].[Vendors]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderServices] ADD CONSTRAINT [WorkOrderServices_trade_id_fkey] FOREIGN KEY ([trade_id]) REFERENCES [dbo].[Trades]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMSAs] ADD CONSTRAINT [WorkOrderMSAs_work_order_id_fkey] FOREIGN KEY ([work_order_id]) REFERENCES [dbo].[WorkOrders]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderMSAs] ADD CONSTRAINT [WorkOrderMSAs_sent_by_fkey] FOREIGN KEY ([sent_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
