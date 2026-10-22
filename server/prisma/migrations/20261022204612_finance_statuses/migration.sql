BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[WorkOrderStatuses] ADD [phase] VARCHAR(10) NOT NULL CONSTRAINT [WorkOrderStatuses_phase_df] DEFAULT 'ops';

-- ── Finance phase ─────────────────────────────────────────────────────
-- Paste above COMMIT TRAN;. The status lines use EXEC because the phase
-- column on WorkOrderStatuses is added earlier in this same migration.

-- Only two phases exist.
EXEC(N'ALTER TABLE [dbo].[WorkOrderStatuses] ADD CONSTRAINT [CK_WorkOrderStatuses_phase] CHECK ([phase] IN (''ops'', ''finance''));');

-- The finance statuses, in workflow order. Safe to re-run: skips any that
-- already exist by name.
EXEC(N'
INSERT INTO [dbo].[WorkOrderStatuses] ([name], [description], [color], [phase])
SELECT v.[name], v.[description], v.[color], ''finance''
FROM (VALUES
  (N''Fin Open'',          N''Handed to finance, nothing sent to the client yet'',  ''#1B3A5C''),
  (N''Waiting on Portal'', N''Waiting to submit or for the client portal to accept'', ''#D97706''),
  (N''Waiting on NTE'',    N''Waiting on the client to approve a not-to-exceed amount'', ''#C2410C''),
  (N''Invoiced / Billed'', N''Invoice sent to the client'',                          ''#0284C7''),
  (N''Client Paid'',       N''Client payment received'',                             ''#7C3AED''),
  (N''Closed'',            N''Paid out and reconciled; nothing left to do'',          ''#15803D'')
) AS v([name], [description], [color])
WHERE NOT EXISTS (
  SELECT 1 FROM [dbo].[WorkOrderStatuses] s WHERE s.[name] = v.[name]
);');

-- Every work order has a known phase.
UPDATE [dbo].[WorkOrders] SET [phase] = 'ops' WHERE [phase] IS NULL;
ALTER TABLE [dbo].[WorkOrders] ADD CONSTRAINT [CK_WorkOrders_phase] CHECK ([phase] IN ('ops', 'finance'));


COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
