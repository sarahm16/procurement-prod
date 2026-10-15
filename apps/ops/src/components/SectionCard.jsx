// components/SectionCard.jsx
//
// The one card shell for every detail page: same border, header and
// spacing everywhere, so cards read as one family.
//
//   <SectionCard title="Contacts" icon={<PeopleOutlineIcon />} count={3}
//                actions={<Button size="small">Add</Button>}>
//     …body…
//   </SectionCard>
//
// Props:
//   title         string
//   icon          node        small icon before the title
//   count         number      muted number after the title (hidden when 0/null)
//   badge         node        anything after the title (a status chip, say)
//   actions       node        right side of the header; clicks don't collapse
//   collapsible   bool        default true
//   defaultOpen   bool        default true
//   disablePadding bool       body has no padding (lists, tables, alerts)
//   bodySx        object      extra sx for the body
//   sx            object      extra sx for the outer card
import { useState } from "react";
import { Box, Collapse, Typography, alpha, useTheme } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const cardTitleSx = {
  fontFamily: '"Barlow", sans-serif',
  fontWeight: 600,
  fontSize: "0.78rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "text.secondary",
  lineHeight: 1.2,
};

/** Small uppercase label for a block inside a card body ("Scope of work"). */
export const subLabelSx = {
  fontFamily: '"Barlow", sans-serif',
  fontSize: "0.68rem",
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "text.disabled",
};

export default function SectionCard({
  title,
  icon,
  count,
  badge,
  actions,
  collapsible = true,
  defaultOpen = true,
  disablePadding = false,
  bodySx,
  sx,
  children,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        minWidth: 0,
        transition: "box-shadow 0.15s ease",
        "&:hover": {
          boxShadow: `0 2px 12px ${alpha("#000", isDark ? 0.3 : 0.06)}`,
        },
        ...sx,
      }}
    >
      <Box
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        sx={{
          px: 2,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 1,
          backgroundColor: alpha(
            theme.palette.primary.main,
            isDark ? 0.06 : 0.03,
          ),
          borderBottom: open ? `1px solid ${theme.palette.divider}` : "none",
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        {icon && (
          <Box
            sx={{
              display: "flex",
              color: "secondary.main",
              "& .MuiSvgIcon-root": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography sx={cardTitleSx}>{title}</Typography>
        {count > 0 && (
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "text.disabled",
            }}
          >
            {count}
          </Typography>
        )}
        {badge}

        <Box
          sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </Box>
        {collapsible && (
          <ExpandMoreIcon
            sx={{
              fontSize: 18,
              color: "text.disabled",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        )}
      </Box>

      <Collapse in={open}>
        <Box sx={{ ...(disablePadding ? {} : { px: 2, py: 1.5 }), ...bodySx }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
