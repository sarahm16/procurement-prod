/*
  Warnings:

  - You are about to drop the column `sarlacc_id` on the `Vendors` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sarlaccId]` on the table `ServiceLines` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sarlaccId]` on the table `Trades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sarlaccId]` on the table `Vendors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sarlaccId` to the `Vendors` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Vendors] DROP COLUMN [sarlacc_id];
ALTER TABLE [dbo].[Vendors] ADD [sarlaccId] VARCHAR(50) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[ServiceLines] ADD CONSTRAINT [ServiceLines_sarlaccId_key] UNIQUE NONCLUSTERED ([sarlaccId]);

-- CreateIndex
ALTER TABLE [dbo].[Trades] ADD CONSTRAINT [Trades_sarlaccId_key] UNIQUE NONCLUSTERED ([sarlaccId]);

-- CreateIndex
ALTER TABLE [dbo].[Vendors] ADD CONSTRAINT [Vendors_sarlaccId_key] UNIQUE NONCLUSTERED ([sarlaccId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
