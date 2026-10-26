BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ContractSites] ADD [resource_flagged_by] INT,
[resource_needed_at] DATETIME2,
[resource_reason] VARCHAR(300);

-- AlterTable
ALTER TABLE [dbo].[VendorContractSites] ADD [notice_id] INT,
[removed_at] DATETIME2,
[removed_by] INT,
[removed_notes] VARCHAR(500),
[removed_reason] VARCHAR(50);

-- AlterTable
ALTER TABLE [dbo].[VendorWarnings] ADD [back_charge] BIT NOT NULL CONSTRAINT [VendorWarnings_back_charge_df] DEFAULT 0,
[back_charge_details] VARCHAR(1000),
[effective_date] DATE,
[reason] VARCHAR(1000);

-- AddForeignKey
ALTER TABLE [dbo].[VendorContractSites] ADD CONSTRAINT [VendorContractSites_notice_id_fkey] FOREIGN KEY ([notice_id]) REFERENCES [dbo].[VendorWarnings]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

IF NOT EXISTS (SELECT 1 FROM [dbo].[VendorStatuses] WHERE [name] = 'Terminated')
    INSERT INTO [dbo].[VendorStatuses] ([name], [description], [color])
    VALUES ('Terminated', 'Terminated by notice from every service line', '#dc2626');
    
COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
