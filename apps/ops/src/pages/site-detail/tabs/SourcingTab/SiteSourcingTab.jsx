// pages/Sites/SiteSourcingTab.jsx
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SourcingPanel from "../../../sourcing/SourcingPanel";
import ServiceLineSourcingCard from "./ServiceLineSourcingCard";
import { useSiteSourcing } from "./useSiteSourcing";

const money = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

function SummaryBar({ summary, rows }) {
  if (!summary) return null;

  const { service_lines, sourced, client_price_total, vendor_price_total } =
    summary;
  const margin = client_price_total - vendor_price_total;
  const unassigned = rows.filter((r) => !r.vendor_id).length;

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
      }}
    >
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Box sx={{ minWidth: 150 }}>
          <Typography
            variant="overline"
            sx={{ fontSize: "0.58rem", color: "text.secondary" }}
          >
            Sourcing complete
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
            {sourced} of {service_lines}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={service_lines ? (sourced / service_lines) * 100 : 0}
            color={sourced === service_lines ? "success" : "secondary"}
            sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
          />
        </Box>

        <Stat label="Client value" value={money(client_price_total)} />
        <Stat label="Vendor cost" value={money(vendor_price_total)} />
        <Stat
          label="Margin"
          value={money(margin)}
          color={margin < 0 ? "error.main" : "success.dark"}
        />

        <Box sx={{ flex: 1 }} />

        {unassigned > 0 && (
          <Chip
            label={`${unassigned} line${unassigned > 1 ? "s" : ""} unassigned`}
            color="warning"
            size="small"
            variant="outlined"
          />
        )}
      </Stack>
    </Paper>
  );
}

const Stat = ({ label, value, color }) => (
  <Box>
    <Typography
      variant="overline"
      sx={{ display: "block", fontSize: "0.58rem", color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography
      variant="subtitle1"
      sx={{ fontWeight: 600, color: color ?? "text.primary" }}
    >
      {value}
    </Typography>
  </Box>
);

export default function SiteSourcingTab({ siteId, userId }) {
  const { rows, summary, loading, error, refresh, mergeRows } =
    useSiteSourcing(siteId);

  const [filter, setFilter] = useState("all"); // all | open | assigned
  const [panelRow, setPanelRow] = useState(null);

  const visible = useMemo(() => {
    if (filter === "open") return rows.filter((r) => !r.is_sourced);
    if (filter === "assigned") return rows.filter((r) => r.vendor_id);
    return rows;
  }, [rows, filter]);

  if (loading) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={220} />
      </Stack>
    );
  }

  // An error must not look like "this site has nothing to source" — that's a
  // reassuring message about a situation we know nothing about.
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" onClick={() => refresh()}>
            Retry
          </Button>
        }
      >
        Couldn't load sourcing for this site.
      </Alert>
    );
  }

  if (!rows.length) {
    return (
      <Alert severity="info">
        This site isn't on any contracts yet, so there's nothing to source. Add
        it to a contract and its service lines will show up here.
      </Alert>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        <SummaryBar summary={summary} rows={rows} />

        <Stack direction="row" alignItems="center" spacing={1}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_, v) => v && setFilter(v)}
          >
            <ToggleButton
              value="all"
              sx={{ px: 1.5, py: 0.25, fontSize: "0.7rem" }}
            >
              All ({rows.length})
            </ToggleButton>
            <ToggleButton
              value="open"
              sx={{ px: 1.5, py: 0.25, fontSize: "0.7rem" }}
            >
              Needs work ({rows.filter((r) => !r.is_sourced).length})
            </ToggleButton>
            <ToggleButton
              value="assigned"
              sx={{ px: 1.5, py: 0.25, fontSize: "0.7rem" }}
            >
              Assigned ({rows.filter((r) => r.vendor_id).length})
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {visible.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
            Nothing in this view.
          </Typography>
        ) : (
          visible.map((row) => (
            <ServiceLineSourcingCard
              key={row.contract_site_id}
              row={row}
              userId={userId}
              onAssign={setPanelRow}
              onReplace={setPanelRow}
              onRowsChanged={mergeRows}
            />
          ))
        )}
      </Stack>

      {/* The same panel the Sourcing page uses. It takes every line at the site
          so multi-line assignment works from here too — assign one vendor to
          landscaping and sweeping in a single pass without leaving the profile. */}
      <SourcingPanel
        open={Boolean(panelRow)}
        onClose={() => setPanelRow(null)}
        row={panelRow}
        siteRows={rows}
        userId={userId}
        onRowsChanged={mergeRows}
      />
    </>
  );
}
