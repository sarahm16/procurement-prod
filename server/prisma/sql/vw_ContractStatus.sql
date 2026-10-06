-- prisma/sql/vw_ContractStatus.sql
--
-- One row per contract, with its status from its own dates.
--
--   active    started, and not past its end date
--   upcoming  start date is in the future
--   ended     past its end date
--
-- Same rules as vw_ServiceLineStatus — keep the two in step:
--   * Dates are inclusive — end_date is the last day of service.
--   * auto_renew contracts never end on their end_date.
--   * "Today" is Pacific time (AT TIME ZONE needs SQL Server 2016+ / Azure).
--
-- Same drop-then-create / GO / not-schema-bound rules as vw_SourcingGrid.sql.

IF OBJECT_ID('dbo.vw_ContractStatus', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ContractStatus;
GO

CREATE VIEW dbo.vw_ContractStatus AS
WITH today AS (
    SELECT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Pacific Standard Time' AS date) AS d
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
        CASE WHEN x.ends_on < x.today   THEN 'ended'
             WHEN x.starts_on > x.today THEN 'upcoming'
             ELSE 'active' END AS status
    FROM x
)
SELECT
    contract_id,
    client_id,
    service_line_id,
    service_line,
    project_name,
    status,
    CAST(CASE WHEN status = 'active' THEN 1 ELSE 0 END AS BIT)               AS is_active,
    CAST(CASE WHEN status IN ('active', 'upcoming') THEN 1 ELSE 0 END AS BIT) AS is_current,
    auto_renew,
    starts_on,
    ends_on
FROM y;