-- prisma/sql/vw_SourcingGrid.sql
--
-- One row per contract site (site x service line) — the grain the sourcing
-- grid renders. Contract sites with no vendor still appear, with NULL vendor
-- columns and 0 flags, because an unsourced site is the most important row
-- on the page.
--
-- Re-run after every `prisma db push`: push does not know this view exists,
-- and a column change silently invalidates it.
--
-- Drop-then-create rather than CREATE OR ALTER, which needs SQL Server 2016
-- SP1+. The GO separator is required: CREATE VIEW must be the first
-- statement in its batch.
--
-- Deliberately NOT schema-bound, so db push can still alter the underlying
-- tables. Add WITH SCHEMABINDING only if you later need an indexed view.

IF OBJECT_ID('dbo.vw_SourcingGrid', 'V') IS NOT NULL
    DROP VIEW dbo.vw_SourcingGrid;
GO

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
               AND d.document_type = 'W-9'
               AND d.date_completed IS NOT NULL
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_w9,

        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorComplianceDocuments d
             WHERE d.vendor_id = v.id
               AND d.document_type = 'MSA'
               AND d.date_completed IS NOT NULL
        ) THEN 1 ELSE 0 END AS BIT)                     AS has_msa,

        CAST(CASE WHEN EXISTS (
            SELECT 1 FROM VendorComplianceDocuments d
             WHERE d.vendor_id = v.id
               AND d.document_type = 'ACH'
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

    -- The current assignment only. OUTER APPLY keeps unsourced contract
    -- sites in the result.
    --
    -- TODO: once VendorSiteStatuses is settled, join it here and filter out
    -- closed assignments, so a terminated vendor stops reading as current:
    --     JOIN VendorSiteStatuses vss ON vss.id = vcs.status_id
    --     AND vss.category <> 'closed'
    OUTER APPLY (
        SELECT TOP 1 vcs.*
          FROM VendorContractSites vcs
         WHERE vcs.contract_site_id = cs.id
         ORDER BY vcs.is_primary DESC, vcs.created_at DESC
    ) a

    LEFT JOIN Vendors v ON v.id = a.vendor_id
)
SELECT
    b.*,

    CAST(CASE WHEN b.service_count > 0
               AND b.priced_count >= b.service_count
         THEN 1 ELSE 0 END AS BIT)                      AS has_rates,

    CAST(CASE WHEN b.exhibit_sent_at   IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS exhibit_sent,
    CAST(CASE WHEN b.exhibit_signed_at IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS exhibit_signed,

    -- The grid's only status: everything done, or not.
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
FROM base b;