BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[HandoffRules] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] VARCHAR(50) NOT NULL,
    [value] VARCHAR(200) NOT NULL,
    [description] VARCHAR(300),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [HandoffRules_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_by] INT,
    CONSTRAINT [HandoffRules_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [HandoffRules_key_key] UNIQUE NONCLUSTERED ([key])
);

-- AddForeignKey
ALTER TABLE [dbo].[HandoffRules] ADD CONSTRAINT [HandoffRules_updated_by_fkey] FOREIGN KEY ([updated_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

   -- Seed: defaults from the Job Handoff Standards deck
   INSERT INTO [dbo].[HandoffRules] ([key], [value], [description]) VALUES
   ('sub_budget_percent',      '50',    'Subcontractor budget, % of gross contract value'),
   ('target_margin_percent',   '50',    'Required gross margin, % of gross contract value'),
   ('deposit_percent',         '50',    'Deposit invoiced on approval, % of gross contract value'),
   ('lead_time_days',          '21',    'Construction lead time: days from handoff to target start'),
   ('production_rate_default', '2000',  'Production rate, $ of contract value per day (construction)'),
   ('production_rate_asphalt', '10000', 'Production rate, $ of contract value per day (asphalt)'),
   ('sub_award_business_days', '10',    'Business days to secure the subcontractor after approval'),
   ('update_cadence',          'AM and PM, with photos', 'Client update standard during active work');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
