import { useState } from "react";

// MUI Imports
import {
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Link,
  LinearProgress,
  Divider,
  Collapse,
  useTheme,
  alpha,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import SendIcon from "@mui/icons-material/Send";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";

// ── Onboarding checklist card ─────────────────────────────────
// items: [{ key, label, complete }]
function VendorOnboardingCard({}) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const span = "half";

  // TO DO: replace with real docs
  const items = [];

  // TO DO: replace with real function
  const onOpenDocuments = () => {};

  const completed = items.filter((i) => i.complete).length;
  const total = items.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

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
          borderBottom: open ? `1px solid ${theme.palette.divider}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => setOpen((v) => !v)}
            sx={{ p: 0.25 }}
          >
            <ExpandMoreIcon
              sx={{
                fontSize: 18,
                transform: open ? "none" : "rotate(-90deg)",
                transition: "transform 0.15s",
              }}
            />
          </IconButton>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 1,
              backgroundColor: theme.palette.primary.main,
              color: "#fff",
            }}
          >
            <ChecklistIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Vendor Onboarding
          </Typography>
        </Box>
        {onOpenDocuments && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={onOpenDocuments}
            sx={{ fontSize: "0.75rem" }}
          >
            Documents
          </Button>
        )}
      </Box>

      <Collapse in={open}>
        <Box sx={{ p: 2 }}>
          {/* Progress */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.75,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Onboarding Progress
            </Typography>
            <Typography
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "primary.main",
              }}
            >
              {completed}/{total} complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            }}
          />

          {/* Checklist items */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {items.map((item) => (
              <Box
                key={item.key}
                sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
              >
                {item.complete ? (
                  <CheckCircleIcon
                    sx={{ fontSize: 20, color: "success.main" }}
                  />
                ) : (
                  <RadioButtonUncheckedIcon
                    sx={{ fontSize: 20, color: "text.disabled" }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: item.complete ? "text.primary" : "text.secondary",
                    fontWeight: item.complete ? 500 : 400,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default VendorOnboardingCard;
