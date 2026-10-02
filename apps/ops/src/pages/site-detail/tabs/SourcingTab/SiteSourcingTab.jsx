// pages/Sites/SiteSourcingTab.jsx
//
// Service lines down the left, the selected line on the right. The list is
// the site-level summary: each line's status is visible at a glance, so there's
// no separate summary bar.
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import SourcingPanel from "../../../sourcing/SourcingPanel";
import ServiceLineSourcingCard, {
  LineIcon,
  StatusChip,
  lineStatus,
} from "./ServiceLineSourcingCard";
import { useSiteSourcing } from "./useSiteSourcing";

// Which line to open first: the one most in need of attention.
const ATTENTION = { none: 0, primary: 1, progress: 2, done: 3 };

export default function SiteSourcingTab({ siteId, userId }) {
  const { rows, loading, error, refresh, mergeRows } = useSiteSourcing(siteId);

  const [selectedId, setSelectedId] = useState(null);
  const [panelRow, setPanelRow] = useState(null);

  // Pick a line once rows arrive, and again if the selected one disappears.
  useEffect(() => {
    if (!rows.length) return;
    if (rows.some((r) => r.contract_site_id === selectedId)) return;
    const first = [...rows].sort(
      (a, b) => ATTENTION[lineStatus(a).key] - ATTENTION[lineStatus(b).key],
    )[0];
    setSelectedId(first.contract_site_id);
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.contract_site_id === selectedId);
  const sourced = useMemo(
    () => rows.filter((r) => r.is_sourced).length,
    [rows],
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
          gap: 2,
        }}
      >
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={420} />
      </Box>
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
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        {/* ── Service lines ──────────────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{ overflow: "hidden", position: { md: "sticky" }, top: 16 }}
        >
          <Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
              Service lines
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {sourced} of {rows.length} sourced
            </Typography>
          </Box>
          <List disablePadding>
            {rows.map((r) => {
              const active = r.contract_site_id === selectedId;
              return (
                <ListItemButton
                  key={r.contract_site_id}
                  selected={active}
                  onClick={() => setSelectedId(r.contract_site_id)}
                  sx={(t) => ({
                    gap: 1.25,
                    py: 1.25,
                    borderTop: 1,
                    borderColor: "divider",
                    borderLeft: 3,
                    borderLeftColor: active
                      ? t.palette.primary.main
                      : "transparent",
                    "&.Mui-selected": {
                      bgcolor: alpha(
                        t.palette.primary.main,
                        t.palette.mode === "dark" ? 0.16 : 0.07,
                      ),
                    },
                  })}
                >
                  <LineIcon name={r.service_line} size={32} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{
                        fontWeight: active ? 700 : 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      {r.service_line}
                    </Typography>
                    <Typography
                      noWrap
                      variant="caption"
                      sx={{ display: "block", color: "text.secondary" }}
                    >
                      {r.vendor ?? "No vendor"}
                    </Typography>
                  </Box>
                  <StatusChip row={r} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        {/* ── Selected line ──────────────────────────────────────────── */}
        {selected && (
          <ServiceLineSourcingCard
            key={selected.contract_site_id}
            row={selected}
            userId={userId}
            onManage={setPanelRow}
            onRowsChanged={mergeRows}
          />
        )}
      </Box>

      {/* The same panel the Sourcing page uses. It opens on this line and has
          a tab for each of the site's other lines. */}
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
