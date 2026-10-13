/*
  Warnings:

  - You are about to drop the column `client_accepted_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `client_required_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `closed_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `completion_notice_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_due_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_exception_by` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_exception_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_exception_reason` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_invoiced_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `deposit_received_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `final_due_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `final_invoiced_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `final_received_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `follow_up_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `planned_finish_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `production_days` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `production_rate_per_day` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `sub_awarded_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `substantial_completion_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `target_start_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `warranty_expires_on` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the `ContractSchedulePhases` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Contracts] DROP CONSTRAINT [Contracts_deposit_exception_by_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[ContractSchedulePhases] DROP CONSTRAINT [ContractSchedulePhases_contract_id_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[ContractSchedulePhases] DROP CONSTRAINT [ContractSchedulePhases_site_id_fkey];

-- AlterTable
ALTER TABLE [dbo].[Contracts] DROP COLUMN [client_accepted_on],
[client_required_on],
[closed_on],
[completion_notice_on],
[deposit_due_on],
[deposit_exception_by],
[deposit_exception_on],
[deposit_exception_reason],
[deposit_invoiced_on],
[deposit_received_on],
[final_due_on],
[final_invoiced_on],
[final_received_on],
[follow_up_on],
[planned_finish_on],
[production_days],
[production_rate_per_day],
[sub_awarded_on],
[substantial_completion_on],
[target_start_on],
[warranty_expires_on];
ALTER TABLE [dbo].[Contracts] ADD [billing_trigger] VARCHAR(30),
[complete_by_on] DATE,
[invoicing_notes] NVARCHAR(1000),
[warranty_months] INT,
[warranty_terms] NVARCHAR(1000);

-- DropTable
DROP TABLE [dbo].[ContractSchedulePhases];

-- ── Checklist: keep only what's checked before any work order exists ──
DELETE cci
FROM [dbo].[ContractChecklistItems] cci
JOIN [dbo].[HandoffChecklistItems] i ON i.[id] = cci.[item_id]
WHERE i.[key] NOT IN ('approval_received', 'indemnity_confirmed');

DELETE FROM [dbo].[HandoffChecklistItems]
WHERE [key] NOT IN ('approval_received', 'indemnity_confirmed');

UPDATE [dbo].[HandoffChecklistItems]
SET [group] = 'handoff', [sort_order] = CASE [key] WHEN 'approval_received' THEN 1 ELSE 2 END
WHERE [key] IN ('approval_received', 'indemnity_confirmed');

INSERT INTO [dbo].[HandoffChecklistItems] ([key], [group], [label], [sort_order], [auto_source], [project_only])
SELECT 'insurance_requirements_known', 'handoff', 'Insurance requirements known (limits, additional insured)', 3, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[HandoffChecklistItems] WHERE [key] = 'insurance_requirements_known');

-- ── Billing trigger for existing contracts: the deck's standard for projects
-- (50% deposit, 50% on completion), invoice-on-completion for the rest.
-- EXEC because billing_trigger is new in this same migration.
EXEC(N'
UPDATE c
SET c.[billing_trigger] = CASE WHEN LOWER(LTRIM(RTRIM(st.[name]))) = ''projects''
                               THEN ''deposit_and_completion''
                               ELSE ''upon_completion'' END
FROM [dbo].[Contracts] c
LEFT JOIN [dbo].[ServiceTypes] st ON st.[id] = c.[service_type_id]
WHERE c.[billing_trigger] IS NULL;
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
