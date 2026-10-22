/*
  Warnings:

  - You are about to drop the column `sender_type` on the `WorkOrderCommunications` table. All the data in the column will be lost.
  - Added the required column `channel` to the `WorkOrderCommunications` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
DROP INDEX [WorkOrderCommunications_work_order_id_idx] ON [dbo].[WorkOrderCommunications];

-- AlterTable
ALTER TABLE [dbo].[WorkOrderCommunications] DROP COLUMN [sender_type];
ALTER TABLE [dbo].[WorkOrderCommunications] ADD [channel] VARCHAR(10) NOT NULL,
[client_user_id] INT,
[vendor_user_id] INT;

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkOrderCommunications_work_order_id_channel_idx] ON [dbo].[WorkOrderCommunications]([work_order_id], [channel]);

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_vendor_user_id_fkey] FOREIGN KEY ([vendor_user_id]) REFERENCES [dbo].[VendorUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [WorkOrderCommunications_client_user_id_fkey] FOREIGN KEY ([client_user_id]) REFERENCES [dbo].[ClientUsers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Exactly one author: our team, a vendor login, or a client login.
EXEC(N'
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [CK_WorkOrderCommunications_one_author]
CHECK (
  (CASE WHEN [employee_id]    IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN [vendor_user_id] IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN [client_user_id] IS NOT NULL THEN 1 ELSE 0 END) = 1
);
');

-- Vendor messages belong to a vendor company and never have a client author;
-- client messages never have a vendor at all.
EXEC(N'
ALTER TABLE [dbo].[WorkOrderCommunications] ADD CONSTRAINT [CK_WorkOrderCommunications_channel]
CHECK (
  ([channel] = ''vendor'' AND [vendor_id] IS NOT NULL AND [client_user_id] IS NULL)
  OR
  ([channel] = ''client'' AND [vendor_id] IS NULL AND [vendor_user_id] IS NULL)
);
');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
