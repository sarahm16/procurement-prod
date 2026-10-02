-- Multiple vendors per site + service line, with one primary.
--
-- Paste this over the contents of the migration.sql that
--   npx prisma migrate dev --create-only --name multi_vendor_primary
-- created, then run `npx prisma migrate dev`.
--
-- GENERATED from prisma/sql/vw_SourcingGrid.sql and
-- prisma/sql/vw_SourcingGridVendors.sql. Prisma runs a migration as one
-- batch, so there are no GO separators: each view is dropped, then created
-- through EXEC (CREATE VIEW must be alone in its batch). Quotes inside the
-- views are doubled for that reason.

-- 1. A closed assignment is never the primary.
UPDATE vcs SET is_primary = 0
FROM   VendorContractSites vcs
JOIN   VendorSiteStatuses vss ON vss.id = vcs.status_id
WHERE  vss.category = 'closed'
  AND  vcs.is_primary = 1;

-- 2. Stop if a site has two live primaries, rather than guess which to keep.
--    To find them:
--      SELECT contract_site_id, COUNT(*) FROM VendorContractSites
--      WHERE is_primary = 1 GROUP BY contract_site_id HAVING COUNT(*) > 1;
IF EXISTS (
    SELECT 1
    FROM   VendorContractSites
    WHERE  is_primary = 1
    GROUP  BY contract_site_id
    HAVING COUNT(*) > 1
)
    THROW 50001, 'Some contract sites have more than one primary vendor. Fix them, then re-run this migration.', 1;

-- 3. Backfill: every site with live vendors but no primary gets one — the
--    same assignment the grid already shows (newest live), so nothing on
--    screen changes.
;WITH pick AS (
    SELECT vcs.id,
           ROW_NUMBER() OVER (PARTITION BY vcs.contract_site_id
                              ORDER BY vcs.created_at DESC, vcs.id DESC) AS rn
    FROM   VendorContractSites vcs
    JOIN   VendorSiteStatuses vss ON vss.id = vcs.status_id
    WHERE  vss.category <> 'closed'
      AND  NOT EXISTS (SELECT 1 FROM VendorContractSites p
                       WHERE p.contract_site_id = vcs.contract_site_id
                         AND p.is_primary = 1)
)
UPDATE vcs SET is_primary = 1
FROM   VendorContractSites vcs
JOIN   pick ON pick.id = vcs.id
WHERE  pick.rn = 1;

-- 4. At most one primary per contract site; any number of backups.
--    Skipped if it already exists (e.g. created by hand before this migration).
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE  name = 'UX_VendorContractSites_Primary'
      AND  object_id = OBJECT_ID('dbo.VendorContractSites')
)
    CREATE UNIQUE INDEX [UX_VendorContractSites_Primary]
        ON [dbo].[VendorContractSites] ([contract_site_id])
        WHERE [is_primary] = 1;

-- 5. Grid view: adds vendor_count and backup_vendor_count.
IF OBJECT_ID('dbo.vw_SourcingGrid', 'V') IS NOT NULL
    DROP VIEW dbo.vw_SourcingGrid;

EXEC(N'
CREATE VIEW dbo.vw_SourcingGrid AS
WITH base AS (
    SELECT
        cs.id                   AS contract_site_id,
        cs.status_id            AS contract_site_status_id,

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

-- 6. New view: every vendor on a contract site.
IF OBJECT_ID('dbo.vw_SourcingGridVendors', 'V') IS NOT NULL
    DROP VIEW dbo.vw_SourcingGridVendors;

EXEC(N'
CREATE VIEW dbo.vw_SourcingGridVendors AS
WITH base AS (
    SELECT
        vcs.id                  AS assignment_id,
        vcs.contract_site_id,
        vcs.is_primary,
        vcs.status_id           AS assignment_status_id,
        vss.category            AS assignment_status_category,
        vcs.created_at          AS assigned_at,

        v.id                    AS vendor_id,
        v.company,
        v.lat                   AS vendor_lat,
        v.lng                   AS vendor_lng,
        v.status_id             AS vendor_status_id,

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

        (SELECT MAX(coi.expiration_date)
           FROM VendorCOIs coi
          WHERE coi.vendor_id = v.id)                   AS coi_expiration,

        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorCOIs coi
             WHERE coi.vendor_id = v.id
               AND coi.additionally_insured_verified = 1
               AND coi.expiration_date > SYSUTCDATETIME()
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_coi,

        (SELECT COUNT(*)
           FROM ContractSiteServices css
          WHERE css.contract_site_id = vcs.contract_site_id) AS service_count,

        (SELECT COUNT(*)
           FROM VendorServicePricing p
           JOIN ContractSiteServices css ON css.id = p.contract_site_service_id
          WHERE p.vendor_contract_site_id = vcs.id
            AND css.contract_site_id = vcs.contract_site_id) AS priced_count,

        (SELECT MAX(e.date_sent)
           FROM VendorExhibits e
           JOIN VendorExhibitContractSites ecs ON ecs.vendor_exhibit_id = e.id
          WHERE ecs.vendor_contract_site_id = vcs.id
            AND e.is_work_order = 0)                    AS exhibit_sent_at,

        (SELECT MAX(e.date_completed)
           FROM VendorExhibits e
           JOIN VendorExhibitContractSites ecs ON ecs.vendor_exhibit_id = e.id
          WHERE ecs.vendor_contract_site_id = vcs.id
            AND e.is_work_order = 0)                    AS exhibit_signed_at,

        (SELECT SUM(p.vendor_price)
           FROM VendorServicePricing p
           JOIN ContractSiteServices css ON css.id = p.contract_site_service_id
          WHERE p.vendor_contract_site_id = vcs.id
            AND css.contract_site_id = vcs.contract_site_id) AS vendor_price_total

    FROM VendorContractSites vcs
    JOIN VendorSiteStatuses vss ON vss.id = vcs.status_id
    JOIN Vendors            v   ON v.id   = vcs.vendor_id
)
SELECT
    b.*,

    CAST(CASE WHEN b.service_count > 0
               AND b.priced_count >= b.service_count
         THEN 1 ELSE 0 END AS BIT)                      AS has_rates,

    CAST(CASE WHEN b.exhibit_sent_at   IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS exhibit_sent,
    CAST(CASE WHEN b.exhibit_signed_at IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS exhibit_signed,

    CAST(CASE WHEN b.has_w9  = 1
               AND b.has_coi = 1
               AND b.has_msa = 1
               AND b.has_ach = 1
               AND b.service_count > 0
               AND b.priced_count >= b.service_count
               AND b.exhibit_sent_at   IS NOT NULL
               AND b.exhibit_signed_at IS NOT NULL
         THEN 1 ELSE 0 END AS BIT)                      AS is_sourced,

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