-- prisma/sql/vw_ServiceLineStatus.sql
--
-- One row per contract site (a site on a service line), with its status
-- worked out from dates. Nothing is stored: a line turns active on its start
-- date and drops off after its end date without anyone touching it.
--
--   active          contract running and the site is on it today
--   upcoming        the contract or the site starts in the future
--   removed         the site came off the contract (contract carries on)
--   contract_ended  the whole contract is over
--
-- Rules:
--   * Dates are inclusive — end_date is the last day of service.
--   * auto_renew contracts never end on their end_date; to end one, turn
--     auto_renew off (and set end_date).
--   * If the site was removed before the contract ended, it reads "removed".
--   * "Today" is Pacific time, so lines flip at local midnight rather than
--     at 5pm when UTC rolls over. AT TIME ZONE needs SQL Server 2016+ (any
--     Azure SQL). Change the zone name here if that's ever wrong.
--
-- Same drop-then-create / GO / not-schema-bound rules as vw_SourcingGrid.sql.

IF OBJECT_ID('dbo.vw_ServiceLineStatus', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ServiceLineStatus;
GO

CREATE VIEW dbo.vw_ServiceLineStatus AS
WITH today AS (
    SELECT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Pacific Standard Time' AS date) AS d
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
                THEN 'removed'
            WHEN x.contract_end < x.today THEN 'contract_ended'
            WHEN x.site_end < x.today     THEN 'removed'
            WHEN x.contract_start > x.today
              OR x.site_start > x.today   THEN 'upcoming'
            ELSE 'active'
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
    CAST(CASE WHEN status = 'active' THEN 1 ELSE 0 END AS BIT)               AS is_active,
    CAST(CASE WHEN status IN ('active', 'upcoming') THEN 1 ELSE 0 END AS BIT) AS is_current,
    starts_on,
    ends_on
FROM y;