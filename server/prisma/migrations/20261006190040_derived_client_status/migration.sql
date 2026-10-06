-- Client status from contracts, plus a manual pause.
--
-- Paste over the migration.sql created by
--   npx prisma migrate dev --create-only --name derived_client_status
-- then run `npx prisma migrate dev`.
--
-- One transaction: if any step fails, none of it sticks.
-- View bodies are GENERATED from prisma/sql/vw_ContractStatus.sql and
-- vw_ClientStatus.sql (quotes doubled for EXEC).

BEGIN TRY
BEGIN TRAN;

-- 1. The pause: the one status that's still set by hand.
ALTER TABLE [dbo].[Clients] ADD
    [paused_at]     DATE NULL,
    [paused_reason] VARCHAR(200) NULL,
    [paused_by]     INT NULL;

ALTER TABLE [dbo].[Clients] ADD CONSTRAINT [Clients_paused_by_fkey]
    FOREIGN KEY ([paused_by]) REFERENCES [dbo].[Employees]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 2. Carry the 2 'Paused' clients over. 'Active' and 'Pending' are dropped:
--    the contracts decide those now. EXEC because the new columns don't
--    exist yet when SQL Server compiles this batch.
EXEC(N'
UPDATE Clients
SET    paused_at     = CAST(SYSDATETIMEOFFSET() AT TIME ZONE ''Pacific Standard Time'' AS date),
       paused_reason = ''Carried over from the old status field''
WHERE  LTRIM(RTRIM(status)) = ''Paused'';
');

-- 3. Drop the free-text status. Anything attached to the column (a default,
--    an index, a check) is looked up by name and removed first.
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE dbo.Clients DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
FROM sys.default_constraints dc
JOIN sys.columns col ON col.object_id = dc.parent_object_id
                    AND col.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.Clients') AND col.name = 'status';

SELECT @sql += N'ALTER TABLE dbo.Clients DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
JOIN sys.columns col ON col.object_id = cc.parent_object_id
                    AND col.column_id = cc.parent_column_id
WHERE cc.parent_object_id = OBJECT_ID('dbo.Clients') AND col.name = 'status';

SELECT @sql += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON dbo.Clients;'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('dbo.Clients') AND col.name = 'status'
  AND i.is_primary_key = 0;

EXEC sp_executesql @sql;

ALTER TABLE [dbo].[Clients] DROP COLUMN [status];

-- 4. Status views (ContractStatus first; ClientStatus reads it).
IF OBJECT_ID('dbo.vw_ContractStatus', 'V') IS NOT NULL DROP VIEW dbo.vw_ContractStatus;
EXEC(N'
CREATE VIEW dbo.vw_ContractStatus AS
WITH today AS (
    SELECT CAST(SYSDATETIMEOFFSET() AT TIME ZONE ''Pacific Standard Time'' AS date) AS d
),
x AS (
    SELECT
        ct.id                                   AS contract_id,
        ct.client_id,
        ct.service_line_id,
        sl.name                                 AS service_line,
        ct.project_name,
        ct.auto_renew,
        CAST(ct.start_date AS date)             AS starts_on,
        CASE WHEN ct.auto_renew = 1 THEN NULL
             ELSE CAST(ct.end_date AS date) END AS ends_on,
        today.d                                 AS today
    FROM Contracts    ct
    JOIN ServiceLines sl ON sl.id = ct.service_line_id
    CROSS JOIN today
),
y AS (
    SELECT
        x.*,
        CASE WHEN x.ends_on < x.today   THEN ''ended''
             WHEN x.starts_on > x.today THEN ''upcoming''
             ELSE ''active'' END AS status
    FROM x
)
SELECT
    contract_id,
    client_id,
    service_line_id,
    service_line,
    project_name,
    status,
    CAST(CASE WHEN status = ''active'' THEN 1 ELSE 0 END AS BIT)               AS is_active,
    CAST(CASE WHEN status IN (''active'', ''upcoming'') THEN 1 ELSE 0 END AS BIT) AS is_current,
    auto_renew,
    starts_on,
    ends_on
FROM y
');

IF OBJECT_ID('dbo.vw_ClientStatus', 'V') IS NOT NULL DROP VIEW dbo.vw_ClientStatus;
EXEC(N'
CREATE VIEW dbo.vw_ClientStatus AS
WITH counts AS (
    SELECT
        cl.id                                                       AS client_id,
        cl.paused_at,
        cl.paused_reason,
        SUM(CASE WHEN c.status = ''active''   THEN 1 ELSE 0 END)      AS active_contracts,
        SUM(CASE WHEN c.status = ''upcoming'' THEN 1 ELSE 0 END)      AS upcoming_contracts,
        SUM(CASE WHEN c.status = ''ended''    THEN 1 ELSE 0 END)      AS ended_contracts,
        COUNT(c.contract_id)                                        AS total_contracts,
        MIN(CASE WHEN c.status = ''upcoming'' THEN c.starts_on END)   AS next_start_date,
        MAX(CASE WHEN c.status = ''ended''    THEN c.ends_on END)     AS last_end_date
    FROM Clients cl
    LEFT JOIN vw_ContractStatus c ON c.client_id = cl.id
    GROUP BY cl.id, cl.paused_at, cl.paused_reason
),
derived AS (
    SELECT
        counts.*,
        CASE WHEN active_contracts   > 0 THEN ''active''
             WHEN upcoming_contracts > 0 THEN ''upcoming''
             WHEN total_contracts    > 0 THEN ''inactive''
             ELSE ''none'' END AS contract_status
    FROM counts
)
SELECT
    client_id,
    CASE WHEN paused_at IS NOT NULL THEN ''paused''
         ELSE contract_status END     AS status,
    contract_status,
    ISNULL(active_contracts, 0)       AS active_contracts,
    ISNULL(upcoming_contracts, 0)     AS upcoming_contracts,
    ISNULL(ended_contracts, 0)        AS ended_contracts,
    total_contracts,
    next_start_date,
    last_end_date,
    paused_at,
    paused_reason
FROM derived
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