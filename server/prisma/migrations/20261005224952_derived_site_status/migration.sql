-- Site status from contracts, not a dropdown.
--
-- Paste over the migration.sql created by
--   npx prisma migrate dev --create-only --name derived_site_status
-- then run `npx prisma migrate dev`.
--
-- Everything runs in one transaction: if any step fails, none of it sticks,
-- and the migration can simply be fixed and re-run.
--
-- GENERATED view bodies come from prisma/sql/vw_ServiceLineStatus.sql,
-- vw_SiteStatus.sql and vw_SourcingGrid.sql (quotes doubled for EXEC).

BEGIN TRY
BEGIN TRAN;

-- 1. ContractSites gets dates instead of a status.
--    Existing rows start when their contract started (all 51 are Active
--    today, so nothing needs an end_date).
ALTER TABLE [dbo].[ContractSites] ADD
    [start_date] DATE NOT NULL CONSTRAINT [ContractSites_start_date_df] DEFAULT CURRENT_TIMESTAMP,
    [end_date]   DATE NULL;

-- EXEC because SQL Server compiles a batch up front and the new column
-- doesn't exist yet at that point.
EXEC(N'
UPDATE cs
SET    start_date = CAST(c.start_date AS date)
FROM   ContractSites cs
JOIN   Contracts c ON c.id = cs.contract_id;
');

CREATE NONCLUSTERED INDEX [ContractSites_site_id_idx]
    ON [dbo].[ContractSites]([site_id]);

-- 2. Remove the manual statuses. Constraint names are looked up rather than
--    hard-coded, because some were created by hand with system names.
DECLARE @sql NVARCHAR(MAX) = N'';

-- foreign keys pointing at SiteStatuses
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id))
             + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
             + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM sys.foreign_keys fk
WHERE fk.referenced_object_id = OBJECT_ID('dbo.SiteStatuses');

-- defaults on the two status_id columns (DEFAULT 3 / DEFAULT 1)
SELECT @sql += N'ALTER TABLE dbo.' + QUOTENAME(OBJECT_NAME(dc.parent_object_id))
             + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
FROM sys.default_constraints dc
JOIN sys.columns col ON col.object_id = dc.parent_object_id
                    AND col.column_id = dc.parent_column_id
WHERE col.name = 'status_id'
  AND dc.parent_object_id IN (OBJECT_ID('dbo.Sites'), OBJECT_ID('dbo.ContractSites'));

-- any index on those columns
SELECT @sql += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON dbo.'
             + QUOTENAME(OBJECT_NAME(i.object_id)) + N';'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id
WHERE col.name = 'status_id'
  AND i.is_primary_key = 0
  AND i.object_id IN (OBJECT_ID('dbo.Sites'), OBJECT_ID('dbo.ContractSites'));

EXEC sp_executesql @sql;

ALTER TABLE [dbo].[Sites]         DROP COLUMN [status_id];
ALTER TABLE [dbo].[ContractSites] DROP COLUMN [status_id];
DROP TABLE [dbo].[SiteStatuses];

-- 3. Status views (ServiceLineStatus first; the others read it).
IF OBJECT_ID('dbo.vw_ServiceLineStatus', 'V') IS NOT NULL DROP VIEW dbo.vw_ServiceLineStatus;
EXEC(N'
CREATE VIEW dbo.vw_ServiceLineStatus AS
WITH today AS (
    SELECT CAST(SYSDATETIMEOFFSET() AT TIME ZONE ''Pacific Standard Time'' AS date) AS d
),
x AS (
    SELECT
        cs.id                                   AS contract_site_id,
        cs.site_id,
        cs.contract_id,
        ct.client_id,
        ct.service_line_id,
        sl.name                                 AS service_line,
        ct.project_name,
        cs.start_date                           AS site_start,
        cs.end_date                             AS site_end,
        CAST(ct.start_date AS date)             AS contract_start,
        CASE WHEN ct.auto_renew = 1 THEN NULL
             ELSE CAST(ct.end_date AS date) END AS contract_end,
        today.d                                 AS today
    FROM ContractSites cs
    JOIN Contracts     ct ON ct.id = cs.contract_id
    JOIN ServiceLines  sl ON sl.id = ct.service_line_id
    CROSS JOIN today
),
y AS (
    SELECT
        x.*,
        CASE WHEN x.site_start > x.contract_start
             THEN x.site_start ELSE x.contract_start END AS starts_on,
        CASE WHEN x.site_end IS NULL THEN x.contract_end
             WHEN x.contract_end IS NULL THEN x.site_end
             WHEN x.site_end < x.contract_end THEN x.site_end
             ELSE x.contract_end END                     AS ends_on,
        CASE
            WHEN x.site_end < x.today
             AND (x.contract_end IS NULL OR x.site_end < x.contract_end)
                THEN ''removed''
            WHEN x.contract_end < x.today THEN ''contract_ended''
            WHEN x.site_end < x.today     THEN ''removed''
            WHEN x.contract_start > x.today
              OR x.site_start > x.today   THEN ''upcoming''
            ELSE ''active''
        END                                              AS status
    FROM x
)
SELECT
    contract_site_id,
    site_id,
    contract_id,
    client_id,
    service_line_id,
    service_line,
    project_name,
    status,
    CAST(CASE WHEN status = ''active'' THEN 1 ELSE 0 END AS BIT)               AS is_active,
    CAST(CASE WHEN status IN (''active'', ''upcoming'') THEN 1 ELSE 0 END AS BIT) AS is_current,
    starts_on,
    ends_on
FROM y
');

IF OBJECT_ID('dbo.vw_SiteStatus', 'V') IS NOT NULL DROP VIEW dbo.vw_SiteStatus;
EXEC(N'
CREATE VIEW dbo.vw_SiteStatus AS
WITH counts AS (
    SELECT
        s.id                                                         AS site_id,
        SUM(CASE WHEN l.status = ''active''   THEN 1 ELSE 0 END)       AS active_lines,
        SUM(CASE WHEN l.status = ''upcoming'' THEN 1 ELSE 0 END)       AS upcoming_lines,
        SUM(CASE WHEN l.status IN (''removed'', ''contract_ended'')
                 THEN 1 ELSE 0 END)                                  AS ended_lines,
        COUNT(l.contract_site_id)                                    AS total_lines,
        MIN(CASE WHEN l.status = ''upcoming'' THEN l.starts_on END)    AS next_start_date,
        MAX(CASE WHEN l.status IN (''removed'', ''contract_ended'')
                 THEN l.ends_on END)                                 AS last_end_date
    FROM Sites s
    LEFT JOIN vw_ServiceLineStatus l ON l.site_id = s.id
    GROUP BY s.id
)
SELECT
    site_id,
    CASE WHEN active_lines   > 0 THEN ''active''
         WHEN upcoming_lines > 0 THEN ''upcoming''
         WHEN total_lines    > 0 THEN ''inactive''
         ELSE ''none'' END                         AS status,
    ISNULL(active_lines, 0)                      AS active_lines,
    ISNULL(upcoming_lines, 0)                    AS upcoming_lines,
    ISNULL(ended_lines, 0)                       AS ended_lines,
    total_lines,
    next_start_date,
    last_end_date
FROM counts
');

-- 4. Sourcing grid: line status instead of status_id; active + upcoming only.
IF OBJECT_ID('dbo.vw_SourcingGrid', 'V') IS NOT NULL DROP VIEW dbo.vw_SourcingGrid;
EXEC(N'
CREATE VIEW dbo.vw_SourcingGrid AS
WITH base AS (
    SELECT
        cs.id                   AS contract_site_id,
        ls.status               AS line_status,
        ls.starts_on,
        ls.ends_on,

        s.id                    AS site_id,
        s.store,
        s.mailing_city,
        s.mailing_state,
        s.lat                   AS site_lat,
        s.lng                   AS site_lng,

        cl.id                   AS client_id,
        cl.client               AS client,

        sl.id                   AS service_line_id,
        sl.name                 AS service_line,

        a.id                    AS assignment_id,
        a.status_id             AS assignment_status_id,
        a.is_primary,
        a.created_at            AS assigned_at,

        ISNULL(vc.vendor_count, 0)        AS vendor_count,
        ISNULL(vc.backup_vendor_count, 0) AS backup_vendor_count,

        v.id                    AS vendor_id,
        v.company,
        v.lat                   AS vendor_lat,
        v.lng                   AS vendor_lng,
        v.status_id             AS vendor_status_id,

        ------------------------------------------------------------------
        -- Vendor-level compliance. These read the same on every contract
        -- site this vendor works, which is the point: clearing a W-9 once
        -- clears it everywhere.
        ------------------------------------------------------------------
        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorComplianceDocuments d
             WHERE d.vendor_id = v.id
               AND d.document_type = ''W-9''
               AND d.date_completed IS NOT NULL
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_w9,

        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorComplianceDocuments d
             WHERE d.vendor_id = v.id
               AND d.document_type = ''MSA''
               AND d.date_completed IS NOT NULL
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_msa,

        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorComplianceDocuments d
             WHERE d.vendor_id = v.id
               AND d.document_type = ''ACH''
               AND d.date_completed IS NOT NULL
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_ach,

        -- COI is tri-state in the UI (valid / expiring / expired), so expose
        -- the date as well as the boolean. The date is the latest COI on
        -- file even if expired, so the grid can say "expired Aug 12".
        (SELECT MAX(coi.expiration_date)
           FROM VendorCOIs coi
          WHERE coi.vendor_id = v.id)                   AS coi_expiration,

        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorCOIs coi
             WHERE coi.vendor_id = v.id
               AND coi.additionally_insured_verified = 1
               AND coi.expiration_date > SYSUTCDATETIME()
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_coi,

        ------------------------------------------------------------------
        -- Site-level progress: rates, exhibit sent, exhibit signed.
        ------------------------------------------------------------------
        (SELECT COUNT(*)
           FROM ContractSiteServices css
          WHERE css.contract_site_id = cs.id)           AS service_count,

        (SELECT COUNT(*)
           FROM VendorServicePricing p
           JOIN ContractSiteServices css ON css.id = p.contract_site_service_id
          WHERE p.vendor_contract_site_id = a.id
            AND css.contract_site_id = cs.id)           AS priced_count,

        (SELECT MAX(e.date_sent)
           FROM VendorExhibits e
           JOIN VendorExhibitContractSites ecs ON ecs.vendor_exhibit_id = e.id
          WHERE ecs.vendor_contract_site_id = a.id
            AND e.is_work_order = 0)                    AS exhibit_sent_at,

        (SELECT MAX(e.date_completed)
           FROM VendorExhibits e
           JOIN VendorExhibitContractSites ecs ON ecs.vendor_exhibit_id = e.id
          WHERE ecs.vendor_contract_site_id = a.id
            AND e.is_work_order = 0)                    AS exhibit_signed_at,

        ------------------------------------------------------------------
        -- Margin headroom, so the grid can sort by it later.
        ------------------------------------------------------------------
        (SELECT SUM(css.client_price)
           FROM ContractSiteServices css
          WHERE css.contract_site_id = cs.id)           AS client_price_total,

        (SELECT SUM(p.vendor_price)
           FROM VendorServicePricing p
           JOIN ContractSiteServices css ON css.id = p.contract_site_service_id
          WHERE p.vendor_contract_site_id = a.id
            AND css.contract_site_id = cs.id)           AS vendor_price_total

    FROM ContractSites cs
    JOIN vw_ServiceLineStatus ls ON ls.contract_site_id = cs.id
    JOIN Sites            s  ON s.id  = cs.site_id
    LEFT JOIN Clients     cl ON cl.id = s.client_id
    JOIN Contracts        ct ON ct.id = cs.contract_id
    JOIN ServiceLines     sl ON sl.id = ct.service_line_id

    -- The assignment the row represents: the primary, or the newest live one
    -- if no primary is marked. OUTER APPLY keeps unsourced contract sites in
    -- the result. currentAssignment() in sourcingAssignRoute.js and
    -- sourcingPricingRoutes.js mirrors this — keep them in step.
    OUTER APPLY (
        SELECT TOP 1 vcs.*
          FROM VendorContractSites vcs
          JOIN VendorSiteStatuses vss ON vss.id = vcs.status_id
         WHERE vcs.contract_site_id = cs.id
           AND vss.category <> ''closed''
         ORDER BY vcs.is_primary DESC, vcs.created_at DESC
    ) a

    -- How many live vendors the site has in total, and how many are backups.
    OUTER APPLY (
        SELECT COUNT(*)                                          AS vendor_count,
               SUM(CASE WHEN vcs.is_primary = 0 THEN 1 ELSE 0 END) AS backup_vendor_count
          FROM VendorContractSites vcs
          JOIN VendorSiteStatuses vss ON vss.id = vcs.status_id
         WHERE vcs.contract_site_id = cs.id
           AND vss.category <> ''closed''
    ) vc

    LEFT JOIN Vendors v ON v.id = a.vendor_id

    WHERE ls.is_current = 1
)
SELECT
    b.*,

    CAST(CASE WHEN b.service_count > 0
               AND b.priced_count >= b.service_count
         THEN 1 ELSE 0 END AS BIT)                      AS has_rates,

    CAST(CASE WHEN b.exhibit_sent_at   IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS exhibit_sent,
    CAST(CASE WHEN b.exhibit_signed_at IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS exhibit_signed,

    -- The grid''s only status: everything done, or not.
    CAST(CASE WHEN b.vendor_id IS NOT NULL
               AND b.has_w9  = 1
               AND b.has_coi = 1
               AND b.has_msa = 1
               AND b.has_ach = 1
               AND b.service_count > 0
               AND b.priced_count >= b.service_count
               AND b.exhibit_sent_at   IS NOT NULL
               AND b.exhibit_signed_at IS NOT NULL
         THEN 1 ELSE 0 END AS BIT)                      AS is_sourced,

    -- Drives the "4/7" cell, and lets the grid sort by how close a row is.
    CAST(
          CASE WHEN b.has_w9  = 1 THEN 1 ELSE 0 END
        + CASE WHEN b.has_coi = 1 THEN 1 ELSE 0 END
        + CASE WHEN b.has_msa = 1 THEN 1 ELSE 0 END
        + CASE WHEN b.has_ach = 1 THEN 1 ELSE 0 END
        + CASE WHEN b.service_count > 0 AND b.priced_count >= b.service_count THEN 1 ELSE 0 END
        + CASE WHEN b.exhibit_sent_at   IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN b.exhibit_signed_at IS NOT NULL THEN 1 ELSE 0 END
    AS TINYINT)                                          AS completed_steps
FROM base b
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