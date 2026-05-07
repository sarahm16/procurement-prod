import { useState, cloneElement } from "react";
import { useLocation } from "react-router-dom";

// Routes Config
import routesConfig from "../../routes/routeConfig";

// Local Components
import SlideOutPanel from "./SlideOutPanel";

// MUI imports
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";

function ListPageHeader({ onRefresh, form }) {
  const location = useLocation();
  const pathname = location.pathname;

  const route = routesConfig.find((r) => pathname === r.path);
  const icon = route ? route.icon : null;
  const title = route ? route.title : "Page Title";

  const [spinning, setSpinning] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const onOpen = () => setFormOpen(true);
  const onClose = () => setFormOpen(false);

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 600);
  };

  const formWithClose = form ? cloneElement(form, { onClose }) : null;

  return (
    <>
      <SlideOutPanel
        title="Create New Item"
        open={formOpen}
        onClose={onClose}
        subtitle=""
      >
        {formWithClose}
      </SlideOutPanel>
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1,
            px: { xs: 2, sm: 3 },
          }}
        >
          {/* Left: icon + title */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/*           {icon && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: "secondary.main",
                "& svg": { fontSize: "1.25rem" },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 700, letterSpacing: "0.01em" }}
          >
            {title}
          </Typography> */}
          </Box>

          {/* Right: actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Refresh list" placement="bottom">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{
                  color: "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: "6px",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    color: "primary.main",
                    borderColor: "primary.main",
                    bgcolor: "transparent",
                  },
                  "& svg": {
                    fontSize: "1.1rem",
                    transition: "transform 0.6s ease",
                    transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
              onClick={onOpen}
              size="small"
              sx={{
                px: 2,
                py: "7px",
                lineHeight: 1,
              }}
            >
              Create New
            </Button>
          </Box>
        </Box>

        <Divider />
      </Box>
    </>
  );
}

export default ListPageHeader;
