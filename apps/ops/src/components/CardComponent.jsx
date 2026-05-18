import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

function CardComponent({
  children,
  title,
  icon,
  action,
  noPadding = false,
  collapsible = false,
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        border: "1px solid",
        borderColor: "grey.100",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out",
        "&:hover": {
          boxShadow: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
        },
        maxWidth: 1200,
      }}
    >
      {title && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2.5,
              py: 2,
              bgcolor: "grey.50",
              borderBottom: "1px solid",
              borderColor: "grey.100",
              cursor: collapsible ? "pointer" : "default",
            }}
            onClick={() => collapsible && setExpanded(!expanded)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {icon && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: "primary.main",
                    color: "white",
                    "& .MuiSvgIcon-root": {
                      fontSize: 18,
                    },
                  }}
                >
                  {icon}
                </Box>
              )}
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "text.primary",
                }}
              >
                {title}
              </Typography>
            </Box>
            {action && <Box>{action}</Box>}
          </Box>
        </>
      )}
      {(!collapsible || expanded) && (
        <Box sx={{ p: noPadding ? 0 : 2.5 }}>{children}</Box>
      )}
    </Box>
  );
}

export default CardComponent;
