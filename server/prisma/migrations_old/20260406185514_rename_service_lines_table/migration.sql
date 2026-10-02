/*
  Warnings:

  - You are about to drop the `Service_Lines` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[ClientServiceLines] DROP CONSTRAINT [FK__ClientSer__servi__489AC854];

-- DropForeignKey
ALTER TABLE [dbo].[ClientServiceLineSOWs] DROP CONSTRAINT [FK__ClientSer__servi__6CD828CA];

-- DropForeignKey
ALTER TABLE [dbo].[ServiceLineExhibitTemplates] DROP CONSTRAINT [FK__ServiceLi__servi__690797E6];

-- DropForeignKey
ALTER TABLE [dbo].[SiteServiceLines] DROP CONSTRAINT [FK__SiteServi__servi__4C6B5938];

-- DropForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] DROP CONSTRAINT [FK__VendorSit__servi__55F4C372];

-- DropTable
DROP TABLE [dbo].[Service_Lines];

-- CreateTable
CREATE TABLE [dbo].[ServiceLines] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK__Service___3213E83F8FFD9AE8] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLines] ADD CONSTRAINT [FK__ClientSer__servi__489AC854] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClientServiceLineSOWs] ADD CONSTRAINT [FK__ClientSer__servi__6CD828CA] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ServiceLineExhibitTemplates] ADD CONSTRAINT [FK__ServiceLi__servi__690797E6] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SiteServiceLines] ADD CONSTRAINT [FK__SiteServi__servi__4C6B5938] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSiteServiceLines] ADD CONSTRAINT [FK__VendorSit__servi__55F4C372] FOREIGN KEY ([service_line_id]) REFERENCES [dbo].[ServiceLines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
