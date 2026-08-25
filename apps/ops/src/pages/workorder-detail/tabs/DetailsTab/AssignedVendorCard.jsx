// workorder-details/tabs/DetailsTab/AssignedVendorCard.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Link,
  Divider,
  useTheme,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import SendIcon from "@mui/icons-material/Send";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";

import {
  useWorkOrderDetails,
  useWorkOrderActions,
  useWorkOrderServices,
} from "../../WorkOrderDetailProvider";

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

function AssignedVendorCard({ span = "half" }) {
  const theme = useTheme();
  const details = useWorkOrderDetails();
  const { updateDetails, sendMSA } = useWorkOrderActions();
  const services = useWorkOrderServices();

  const sendMsaDisabled =
    !services?.length ||
    !services.every((s) => s.vendor_price && s.client_price);

  console.log("msa sending is disabled", sendMsaDisabled);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [sendingMsa, setSendingMsa] = useState(false);

  // Local vendor object so assign/remove reflect immediately.
  const [vendor, setVendor] = useState(details?.vendor ?? null);

  // MSA comes from details (set on load and after a successful send).
  const msa = details?.msa ?? null;

  useEffect(() => {
    setVendor(details?.vendor ?? null);
  }, [details?.vendor]);

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`/api/vendors`);
      setVendors(response.data);
    } catch (e) {
      console.error("Error fetching vendors:", e);
    }
  };

  useEffect(() => {
    if (!vendor || replacing) fetchVendors();
  }, [vendor, replacing]);

  const showPicker = !vendor || replacing;

  const onAssign = async () => {
    if (!selectedVendor) return;
    await updateDetails({ vendor_id: selectedVendor.id });
    setVendor(selectedVendor);
    setSelectedVendor(null);
    setReplacing(false);
  };

  const onRemove = async () => {
    await updateDetails({ vendor_id: null });
    setVendor(null);
  };

  const startReplace = () => {
    setSelectedVendor(vendor ?? null);
    setReplacing(true);
  };

  const cancelReplace = () => {
    setSelectedVendor(null);
    setReplacing(false);
  };

  const handleSendMsa = async () => {
    setSendingMsa(true);
    try {
      await sendMSA();
    } finally {
      setSendingMsa(false);
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
        display: "flex",
        flexDirection: "column",
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
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
          Assigned Vendor
        </Typography>
        {vendor && !replacing && (
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ p: 0.25 }}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {showPicker ? (
        <Box sx={{ p: 3 }}>
          {!vendor && !replacing && (
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <BusinessOutlinedIcon
                sx={{ fontSize: 32, color: "text.disabled", mb: 1 }}
              />
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                No vendor assigned to this work order.
              </Typography>
            </Box>
          )}

          {replacing && (
            <Typography
              sx={{ fontSize: "0.85rem", color: "text.secondary", mb: 1.5 }}
            >
              Select a new vendor to replace <strong>{vendor?.company}</strong>.
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Autocomplete
              size="small"
              value={selectedVendor}
              options={vendors}
              getOptionLabel={(o) => o.company ?? ""}
              sx={{ flex: 1 }}
              onChange={(e, newValue) => setSelectedVendor(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Select a Vendor"
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
            <Button
              variant="contained"
              size="small"
              onClick={onAssign}
              disabled={!selectedVendor}
              sx={{ flexShrink: 0 }}
            >
              {replacing ? "Replace" : "Assign"}
            </Button>
            {replacing && (
              <Button
                size="small"
                onClick={cancelReplace}
                sx={{ flexShrink: 0, color: "text.secondary" }}
              >
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          {/* Vendor identity */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 44,
                height: 44,
                fontSize: "0.9rem",
                fontWeight: 700,
              }}
            >
              {initials(vendor.company)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {vendor.company}
                </Typography>
                <IconButton
                  size="small"
                  component="a"
                  href={`/vendors/${vendor.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ p: 0.25, color: "text.secondary" }}
                >
                  <OpenInNewIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>
              {vendor.primary_contact_name && (
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                >
                  {vendor.primary_contact_name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Contact rows */}
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}
          >
            {vendor.email && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "text.secondary",
                  }}
                >
                  <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: "0.8rem" }}>Email</Typography>
                </Box>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {vendor.email}
                </Typography>
              </Box>
            )}
            {vendor.phone && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "text.secondary",
                  }}
                >
                  <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: "0.8rem" }}>Phone</Typography>
                </Box>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {vendor.phone}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* MSA row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>
              MSA
            </Typography>
            {msa ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Link
                  href={`https://app.pandadoc.com/a/#/documents/${msa.pandadoc_id}`}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    fontSize: "0.8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.25,
                  }}
                >
                  {msa.date_sent
                    ? new Date(msa.date_sent).toLocaleDateString()
                    : "Sent"}{" "}
                  — {msa.status}
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Link>
              </Box>
            ) : (
              <Button
                size="small"
                variant="outlined"
                disabled={sendMsaDisabled}
                startIcon={
                  sendingMsa ? (
                    <CircularProgress size={13} color="inherit" />
                  ) : (
                    <SendIcon sx={{ fontSize: 14 }} />
                  )
                }
                onClick={handleSendMsa}
                disabled={sendingMsa}
                sx={{ fontSize: "0.75rem" }}
              >
                {sendingMsa ? "Sending…" : "Send MSA"}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            startReplace();
          }}
          sx={{ fontSize: "0.8rem" }}
        >
          Replace Vendor
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onRemove();
          }}
          sx={{ fontSize: "0.8rem", color: "error.main" }}
        >
          Remove Vendor
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default AssignedVendorCard;
