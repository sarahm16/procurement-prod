// client-detail/ClientSegmentPicker.jsx
//
// The client's segment in the page header: a coloured chip that opens a menu
// to change or clear it. Saves straight away (PUT /api/clients/:id with
// segment_id); the server logs the change on the Activity tab.
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import Check from "@mui/icons-material/Check";

import ClientSegmentChip from "../../components/ClientSegmentChip/ClientSegmentChip";
import {
  SEGMENT_LABEL,
  getSegmentConfig,
} from "../../*/constants/clientSegmentConfig";
import { useClientActions, useClientDetails } from "./ClientDetailProvider";

export default function ClientSegmentPicker() {
  const details = useClientDetails();
  const { updateDetails } = useClientActions();
  const [segments, setSegments] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get("/api/clients/segments")
      .then(({ data }) => setSegments(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching client segments:", e));
  }, []);

  if (!details?.id) return null;

  const currentId = details.segment_id ?? null;
  const current =
    segments.find((s) => s.id === currentId)?.name ?? details.segment ?? null;

  const choose = async (id) => {
    setAnchorEl(null);
    if (id === currentId) return;
    setSaving(true);
    try {
      await updateDetails({ segment_id: id });
    } catch (e) {
      console.error("Error updating segment:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Tooltip title={`Change ${SEGMENT_LABEL.toLowerCase()}`} arrow>
        <span>
          <ClientSegmentChip
            segment={current}
            emptyLabel
            disabled={saving}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          />
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {segments.map((s) => {
          const { icon: Icon, color } = getSegmentConfig(s.name);
          return (
            <MenuItem
              key={s.id}
              selected={s.id === currentId}
              onClick={() => choose(s.id)}
            >
              <ListItemIcon sx={{ color }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{s.name}</ListItemText>
              {s.id === currentId && <Check fontSize="small" sx={{ ml: 2 }} />}
            </MenuItem>
          );
        })}
        {currentId != null && <Divider />}
        {currentId != null && (
          <MenuItem onClick={() => choose(null)}>
            <ListItemText sx={{ color: "text.secondary" }}>Clear</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
