BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ContractSchedulePhases] (
    [id] INT NOT NULL IDENTITY(1,1),
    [contract_id] INT NOT NULL,
    [sort_order] INT NOT NULL CONSTRAINT [ContractSchedulePhases_sort_order_df] DEFAULT 0,
    [label] VARCHAR(50) NOT NULL,
    [description] NVARCHAR(500),
    [planned_on] DATE,
    [site_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ContractSchedulePhases_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ContractSchedulePhases_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContractSchedulePhases_contract_id_sort_order_idx] ON [dbo].[ContractSchedulePhases]([contract_id], [sort_order]);

-- AddForeignKey
ALTER TABLE [dbo].[ContractSchedulePhases] ADD CONSTRAINT [ContractSchedulePhases_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contracts]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractSchedulePhases] ADD CONSTRAINT [ContractSchedulePhases_site_id_fkey] FOREIGN KEY ([site_id]) REFERENCES [dbo].[Sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
