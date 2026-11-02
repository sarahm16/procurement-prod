// pages/Sites/SelfPerformSwitch.jsx
//
// "Self-performed" switch for one site service line. Our own crews do a
// self-performed line, so it needs no vendor: it drops off the Sourcing page
// and counts under Planned Maintenance → Self-performed in Reports.
import { useState } from "react";
import axios from "axios";
import { CircularProgress, FormControlLabel, Switch, Tooltip, Typography } from "@mui/material";

export default function SelfPerformSwitch({ row, userId, onRowsChanged, onError }) {
  const [saving, setSaving] = useState(false);
  const on = Boolean(row.self_perform);

  const toggle = async () => {
    if (!userId) {
      onError?.("Couldn't tell who you are. Refresh the page and try again.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(`/api/sourcing/contract-sites/${row.contract_site_id}/self-perform`, {
        self_perform: !on,
        user_id: userId,
      });
      if (data?.rows) onRowsChanged?.(data.rows);
    } catch (e) {
      console.error("Error setting self-perform:", e);
      onError?.(e?.response?.data?.error ?? "Couldn't save that change.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tooltip
      arrow
      title={
        on
          ? "Our crews do this line. Turn off to source a vendor for it."
          : `Our own crews do ${row.service_line} here, so it needs no vendor${row.needs_resourcing ? '. Clears "Resource now".' : "."}`
      }
    >
      <FormControlLabel
        sx={{ mr: 0, ml: 0.5 }}
        control={
          saving ? (
            <CircularProgress size={18} sx={{ mx: 1.25, my: 1 }} />
          ) : (
            <Switch size="small" checked={on} onChange={toggle} color="info" slotProps={{ input: { "aria-label": "Self-performed" } }} />
          )
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            Self-performed
          </Typography>
        }
      />
    </Tooltip>
  );
}
