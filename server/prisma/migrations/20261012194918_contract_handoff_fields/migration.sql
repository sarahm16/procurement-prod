BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Clients] ADD [invoice_portal] VARCHAR(200);

-- AlterTable
ALTER TABLE [dbo].[Contracts] ADD [approved_on] DATE,
[client_accepted_on] DATE,
[client_payment_terms] VARCHAR(50),
[client_required_on] DATE,
[client_sla] VARCHAR(200),
[closed_on] DATE,
[communication_plan] NVARCHAR(1000),
[company_id] INT,
[completion_notice_on] DATE,
[deposit_due_on] DATE,
[deposit_exception_by] INT,
[deposit_exception_on] DATE,
[deposit_exception_reason] VARCHAR(300),
[deposit_invoiced_on] DATE,
[deposit_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [Contracts_deposit_percent_df] DEFAULT 50,
[deposit_received_on] DATE,
[executive_summary] NVARCHAR(2000),
[final_due_on] DATE,
[final_invoiced_on] DATE,
[final_received_on] DATE,
[follow_up_on] DATE,
[handoff_on] DATE,
[handoff_submitted_by] INT,
[inspections_required] BIT NOT NULL CONSTRAINT [Contracts_inspections_required_df] DEFAULT 0,
[internal_system_id] INT,
[lead_time_days] INT NOT NULL CONSTRAINT [Contracts_lead_time_days_df] DEFAULT 21,
[lead_time_override_reason] VARCHAR(300),
[permits_required] BIT NOT NULL CONSTRAINT [Contracts_permits_required_df] DEFAULT 0,
[planned_finish_on] DATE,
[production_days] INT,
[production_rate_per_day] DECIMAL(10,2),
[safety_notes] NVARCHAR(1000),
[scope_of_work] NVARCHAR(max),
[sub_award_business_days] INT NOT NULL CONSTRAINT [Contracts_sub_award_business_days_df] DEFAULT 10,
[sub_awarded_on] DATE,
[sub_budget_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [Contracts_sub_budget_percent_df] DEFAULT 50,
[sub_payment_terms] VARCHAR(50),
[substantial_completion_on] DATE,
[target_margin_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [Contracts_target_margin_percent_df] DEFAULT 50,
[target_start_on] DATE,
[traffic_control_required] BIT NOT NULL CONSTRAINT [Contracts_traffic_control_required_df] DEFAULT 0,
[update_cadence] VARCHAR(100) NOT NULL CONSTRAINT [Contracts_update_cadence_df] DEFAULT 'AM and PM, with photos',
[warranty_expires_on] DATE;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_internal_system_id_fkey] FOREIGN KEY ([internal_system_id]) REFERENCES [dbo].[Softwares]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_company_id_fkey] FOREIGN KEY ([company_id]) REFERENCES [dbo].[Companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_deposit_exception_by_fkey] FOREIGN KEY ([deposit_exception_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contracts] ADD CONSTRAINT [Contracts_handoff_submitted_by_fkey] FOREIGN KEY ([handoff_submitted_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
