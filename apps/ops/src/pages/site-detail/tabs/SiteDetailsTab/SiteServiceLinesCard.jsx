// site-details/tabs/SiteServiceLinesCard.jsx
import { useState, useEffect } from "react";
import axios from "axios";

import {
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import { getServiceLineConfig } from "../../../../*/constants/serviceLineConfig";
import { useSiteActions } from "../../SiteDetailProvider";

/**
 * Site service lines, one per row, with an editable status.
 *
 * Props:
 *  - serviceLines: [{ contract_site_id, service_line, status_id, status, status_color }]]
 */
export default function SiteServiceLinesCard({
  serviceLines = [],
  span = "full",
}) {
  const theme = useTheme();

  console.log("card service lines", serviceLines);

  const [menu, setMenu] = useState({ anchor: null, contractSiteId: null });
  const [savingId, setSavingId] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);

  const { updateServiceLineStatus } = useSiteActions();

  const fetchSiteStatuses = async () => {
    const response = await axios.get(`/api/sites/statuses`);
    console.log("fetched statuses", response.data);
    setStatusOptions(response.data);
  };

  useEffect(() => {
    fetchSiteStatuses();
  }, []);

  const openMenu = (e, contractSiteId) =>
    setMenu({ anchor: e.currentTarget, contractSiteId });
  const closeMenu = () => setMenu({ anchor: null, contractSiteId: null });

  const chooseStatus = async (statusId) => {
    const contractSiteId = menu.contractSiteId;
    console.log("choose status", statusId, contractSiteId);
    closeMenu();
    if (!contractSiteId) return;
    setSavingId(contractSiteId);
    try {
      await updateServiceLineStatus?.(contractSiteId, statusId);
    } catch (e) {
      console.error("Error updating service line status:", e);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
        gridColumn: span === "full" ? "1 / -1" : "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountTreeOutlinedIcon
          sx={{ fontSize: 17, color: "text.secondary" }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          Service Lines
        </Typography>
        {serviceLines.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "text.secondary",
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
              px: 0.85,
              py: 0.1,
              borderRadius: 1,
            }}
          >
            {serviceLines.length}
          </Typography>
        )}
      </Box>

      {/* Rows */}
      <Box>
        {serviceLines.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
              No service lines assigned to this site.
            </Typography>
          </Box>
        ) : (
          serviceLines.map((line, idx) => {
            const cfg = getServiceLineConfig(line.service_line);
            const Icon = cfg.icon;
            const statusColor =
              line.status_color ?? theme.palette.text.disabled;
            const isSaving = savingId === line.contract_site_id;

            return (
              <Box
                key={line.contract_site_id ?? `${line.service_line}-${idx}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderTop:
                    idx === 0 ? "none" : `1px solid ${theme.palette.divider}`,
                }}
              >
                {/* Service line icon badge */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    flexShrink: 0,
                    color: cfg.color,
                    backgroundColor: alpha(cfg.color, 0.12),
                  }}
                >
                  <Icon sx={{ fontSize: 19 }} />
                </Box>

                {/* Service line name */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    {line.service_line}
                  </Typography>
                  {/* future: sourcing indicator goes here */}
                </Box>

                {/* Editable status chip (opens the status menu) */}
                {isSaving ? (
                  <CircularProgress size={18} sx={{ flexShrink: 0, mr: 1 }} />
                ) : (
                  <Chip
                    label={line.status ?? "Set status"}
                    size="small"
                    onClick={(e) => {
                      console.log("e", e, "line", line);
                      openMenu(e, line.contract_site_id);
                    }}
                    deleteIcon={<KeyboardArrowDownIcon />}
                    onDelete={(e) => openMenu(e, line.contract_site_id)}
                    sx={{
                      flexShrink: 0,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      height: 24,
                      backgroundColor: line.status
                        ? alpha(statusColor, 0.14)
                        : alpha(theme.palette.text.primary, 0.06),
                      color: line.status ? statusColor : "text.secondary",
                      border: `1px solid ${
                        line.status
                          ? alpha(statusColor, 0.3)
                          : theme.palette.divider
                      }`,
                      "& .MuiChip-deleteIcon": {
                        color: line.status ? statusColor : "text.secondary",
                        fontSize: 16,
                        "&:hover": {
                          color: line.status ? statusColor : "text.primary",
                        },
                      },
                    }}
                  />
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Shared status menu */}
      <Menu anchorEl={menu.anchor} open={!!menu.anchor} onClose={closeMenu}>
        {statusOptions.map((s) => {
          const currentLine = serviceLines.find(
            (l) => l.contract_site_id === menu.contractSiteId,
          );
          const isCurrent = currentLine?.status_id === s.id;
          return (
            <MenuItem
              key={s.id}
              onClick={() => chooseStatus(s.id)}
              sx={{ fontSize: "0.82rem", gap: 1 }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: s.color ?? theme.palette.text.disabled,
                  flexShrink: 0,
                }}
              />
              {s.name}
              {isCurrent && (
                <CheckIcon
                  sx={{ fontSize: 15, ml: "auto", color: "text.secondary" }}
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
