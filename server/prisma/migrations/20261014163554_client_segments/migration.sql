/*
  Warnings:

  - You are about to drop the column `company_id` on the `Contracts` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_company_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [segment_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Contracts] DROP COLUMN [company_id];

-- CreateTable
CREATE TABLE [dbo].[ClientSegments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(50) NOT NULL,
    [sort_order] INT NOT NULL CONSTRAINT [ClientSegments_sort_order_df] DEFAULT 0,
    CONSTRAINT [ClientSegments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClientSegments_name_key] UNIQUE NONCLUSTERED ([name])
);

-- AddForeignKey
ALTER TABLE [dbo].[Clients] ADD CONSTRAINT [Clients_segment_id_fkey] FOREIGN KEY ([segment_id]) REFERENCES [dbo].[ClientSegments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
-- Seed: client segments

INSERT INTO [dbo].[ClientSegments] ([name], [sort_order]) VALUES
('Government',  1),
('Commercial',  2),
('Residential', 3);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
