/*
  Warnings:

  - You are about to drop the column `workorder_type` on the `WorkOrders` table. All the data in the column will be lost.
  - Added the required column `type` to the `WorkOrders` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[WorkOrders] DROP COLUMN [workorder_type];
ALTER TABLE [dbo].[WorkOrders] ADD [type] VARCHAR(50) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
