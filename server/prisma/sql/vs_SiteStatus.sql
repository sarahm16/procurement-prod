-- prisma/sql/vw_SiteStatus.sql
--
-- One row per site, rolled up from vw_ServiceLineStatus. Replaces the old
-- manual Sites.status_id.
--
--   active    at least one line is active
--   upcoming  nothing active yet, but at least one line is starting
--   inactive  every line has ended or been removed
--   none      the site has never been on a contract
--
-- Create vw_ServiceLineStatus first; this view reads it.

IF OBJECT_ID('dbo.vw_SiteStatus', 'V') IS NOT NULL
    DROP VIEW dbo.vw_SiteStatus;
GO

CREATE VIEW dbo.vw_SiteStatus AS
WITH counts AS (
    SELECT
        s.id                                                         AS site_id,
        SUM(CASE WHEN l.status = 'active'   THEN 1 ELSE 0 END)       AS active_lines,
        SUM(CASE WHEN l.status = 'upcoming' THEN 1 ELSE 0 END)       AS upcoming_lines,
        SUM(CASE WHEN l.status IN ('removed', 'contract_ended')
                 THEN 1 ELSE 0 END)                                  AS ended_lines,
        COUNT(l.contract_site_id)                                    AS total_lines,
        MIN(CASE WHEN l.status = 'upcoming' THEN l.starts_on END)    AS next_start_date,
        MAX(CASE WHEN l.status IN ('removed', 'contract_ended')
                 THEN l.ends_on END)                                 AS last_end_date
    FROM Sites s
    LEFT JOIN vw_ServiceLineStatus l ON l.site_id = s.id
    GROUP BY s.id
)
SELECT
    site_id,
    CASE WHEN active_lines   > 0 THEN 'active'
         WHEN upcoming_lines > 0 THEN 'upcoming'
         WHEN total_lines    > 0 THEN 'inactive'
         ELSE 'none' END                         AS status,
    ISNULL(active_lines, 0)                      AS active_lines,
    ISNULL(upcoming_lines, 0)                    AS upcoming_lines,
    ISNULL(ended_lines, 0)                       AS ended_lines,
    total_lines,
    next_start_date,
    last_end_date
FROM counts;