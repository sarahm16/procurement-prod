-- prisma/sql/vw_ClientStatus.sql
--
-- One row per client. Replaces the old free-text Clients.status.
--
--   paused    Clients.paused_at is set — overrides everything below
--   active    at least one contract is active
--   upcoming  nothing active yet, but a contract is starting
--   inactive  every contract has ended
--   none      the client has never had a contract
--
-- `contract_status` is the same thing WITHOUT the pause, so a paused client
-- can still show what its contracts are doing ("Paused · contracts active").
--
-- Create vw_ContractStatus first; this view reads it.

IF OBJECT_ID('dbo.vw_ClientStatus', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ClientStatus;
GO

CREATE VIEW dbo.vw_ClientStatus AS
WITH counts AS (
    SELECT
        cl.id                                                       AS client_id,
        cl.paused_at,
        cl.paused_reason,
        SUM(CASE WHEN c.status = 'active'   THEN 1 ELSE 0 END)      AS active_contracts,
        SUM(CASE WHEN c.status = 'upcoming' THEN 1 ELSE 0 END)      AS upcoming_contracts,
        SUM(CASE WHEN c.status = 'ended'    THEN 1 ELSE 0 END)      AS ended_contracts,
        COUNT(c.contract_id)                                        AS total_contracts,
        MIN(CASE WHEN c.status = 'upcoming' THEN c.starts_on END)   AS next_start_date,
        MAX(CASE WHEN c.status = 'ended'    THEN c.ends_on END)     AS last_end_date
    FROM Clients cl
    LEFT JOIN vw_ContractStatus c ON c.client_id = cl.id
    GROUP BY cl.id, cl.paused_at, cl.paused_reason
),
derived AS (
    SELECT
        counts.*,
        CASE WHEN active_contracts   > 0 THEN 'active'
             WHEN upcoming_contracts > 0 THEN 'upcoming'
             WHEN total_contracts    > 0 THEN 'inactive'
             ELSE 'none' END AS contract_status
    FROM counts
)
SELECT
    client_id,
    CASE WHEN paused_at IS NOT NULL THEN 'paused'
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
FROM derived;