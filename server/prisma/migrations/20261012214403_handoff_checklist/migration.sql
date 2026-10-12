BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[HandoffChecklistItems] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] VARCHAR(50) NOT NULL,
    [group] VARCHAR(30) NOT NULL,
    [label] VARCHAR(150) NOT NULL,
    [sort_order] INT NOT NULL CONSTRAINT [HandoffChecklistItems_sort_order_df] DEFAULT 0,
    [auto_source] VARCHAR(50),
    [project_only] BIT NOT NULL CONSTRAINT [HandoffChecklistItems_project_only_df] DEFAULT 0,
    [is_active] BIT NOT NULL CONSTRAINT [HandoffChecklistItems_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [HandoffChecklistItems_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [HandoffChecklistItems_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [HandoffChecklistItems_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[ContractChecklistItems] (
    [id] INT NOT NULL IDENTITY(1,1),
    [contract_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [done_on] DATE NOT NULL,
    [done_by] INT,
    [note] VARCHAR(300),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ContractChecklistItems_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ContractChecklistItems_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContractChecklistItems_contract_id_item_id_key] UNIQUE NONCLUSTERED ([contract_id],[item_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HandoffChecklistItems_group_sort_order_idx] ON [dbo].[HandoffChecklistItems]([group], [sort_order]);

-- AddForeignKey
ALTER TABLE [dbo].[ContractChecklistItems] ADD CONSTRAINT [ContractChecklistItems_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contracts]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractChecklistItems] ADD CONSTRAINT [ContractChecklistItems_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[HandoffChecklistItems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractChecklistItems] ADD CONSTRAINT [ContractChecklistItems_done_by_fkey] FOREIGN KEY ([done_by]) REFERENCES [dbo].[Employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Seed: checklist items from the Job Handoff Standards deck (slides 5, 11, 12)
   INSERT INTO [dbo].[HandoffChecklistItems] ([key], [group], [label], [sort_order], [auto_source], [project_only]) VALUES
   ('approval_received',        'operations',          'Approval received',                                 1, 'approved_on',               0),
   ('deposit_confirmed',        'operations',          'Deposit confirmed',                                 2, 'deposit_received_on',       1),
   ('sub_secured',              'operations',          'Subcontractor secured',                             3, 'sub_awarded_on',            0),
   ('schedule_confirmed',       'operations',          'Schedule confirmed',                                4, NULL,                        0),
   ('client_start_notice',      'operations',          'Client start notice sent',                          5, NULL,                        0),
   ('daily_updates_running',    'operations',          'Daily AM/PM updates running',                       6, NULL,                        0),
   ('substantial_completion',   'operations',          'Substantial completion',                            7, 'substantial_completion_on', 0),
   ('final_closeout',           'operations',          'Final closeout',                                    8, 'closed_on',                 0),
   ('sub_w9',                   'subcontractor_file',  'W-9',                                               1, 'vendor_w9',                 0),
   ('sub_coi',                  'subcontractor_file',  'Current COI meeting contract limits',               2, 'vendor_coi',                0),
   ('sub_msa',                  'subcontractor_file',  'Signed subcontract or MSA',                         3, NULL,                        0),
   ('sub_scope_acceptance',     'subcontractor_file',  'Written scope acceptance',                          4, NULL,                        0),
   ('sub_schedule_commitment',  'subcontractor_file',  'Schedule and crew commitment',                      5, NULL,                        0),
   ('insurance_verified',       'risk',                'Insurance verified before dispatch',                1, NULL,                        0),
   ('indemnity_confirmed',      'risk',                'Indemnity language confirmed in signed contract',   2, NULL,                        0),
   ('punch_list_complete',      'field_closeout',      'Punch list complete',                               1, NULL,                        0),
   ('site_cleared',             'field_closeout',      'Debris, equipment and temporary controls removed',  2, NULL,                        0),
   ('access_restored',          'field_closeout',      'Client access restored',                            3, NULL,                        0),
   ('final_photos',             'field_closeout',      'Final overview and detail photos captured',         4, NULL,                        0),
   ('client_acceptance',        'field_closeout',      'Client acceptance in writing',                      5, 'client_accepted_on',        0),
   ('reports_uploaded',         'system_closeout',     'All reports and photos uploaded',                   1, NULL,                        0),
   ('internal_record_closed',   'system_closeout',     'Sarlac / UtilizeCore record closed',                2, NULL,                        0),
   ('client_portal_closed',     'system_closeout',     'Client portal work order closed',                   3, NULL,                        0),
   ('permits_attached',         'system_closeout',     'Permits and inspection approvals attached',         4, NULL,                        0),
   ('warranties_recorded',      'system_closeout',     'Warranties and follow-up dates recorded',           5, NULL,                        0),
   ('billing_notified',         'accounting_closeout', 'Billing notified of substantial completion',        1, NULL,                        0),
   ('final_invoice_issued',     'accounting_closeout', 'Final invoice issued',                              2, 'final_invoiced_on',         0),
   ('due_date_recorded',        'accounting_closeout', 'Contractual due date recorded',                     3, 'final_due_on',              0),
   ('sub_invoice_checked',      'accounting_closeout', 'Sub invoice checked against approved budget',       4, NULL,                        0),
   ('disputes_escalated',       'accounting_closeout', 'Disputes escalated before payment release',         5, NULL,                        0);
   
COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
