// components/ClientSegmentChip/ClientSegmentChip.jsx
//
// A client's segment as a chip in its own icon + colour — same look as the
// service line chips. Pass onClick to make it a button (the detail header
// uses that to open the picker).
import { Chip, alpha } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
// Adjust this path to wherever constants/ lives relative to components/.
import {
  SEGMENT_LABEL,
  getSegmentConfig,
} from "../../*/constants/clientSegmentConfig";

export default function ClientSegmentChip({
  segment,
  onClick,
  disabled,
  size = "small",
  emptyLabel, // shown when there's no segment; omit to render nothing
}) {
  if (!segment) {
    if (!emptyLabel) return null;
    return (
      <Chip
        icon={<AddIcon />}
        label={
          emptyLabel === true
            ? `Add ${SEGMENT_LABEL.toLowerCase()}`
            : emptyLabel
        }
        size={size}
        variant="outlined"
        onClick={onClick}
        disabled={disabled}
        sx={{
          height: 24,
          fontSize: "0.72rem",
          borderStyle: "dashed",
          color: "text.secondary",
          "& .MuiChip-icon": { fontSize: 15, ml: 0.75 },
        }}
      />
    );
  }

  const { icon: Icon, color } = getSegmentConfig(segment);
  return (
    <Chip
      icon={<Icon />}
      label={segment}
      size={size}
      onClick={onClick}
      disabled={disabled}
      sx={{
        height: 24,
        fontWeight: 600,
        fontSize: "0.72rem",
        color: "text.primary",
        bgcolor: alpha(color, 0.1),
        border: `1px solid ${alpha(color, 0.45)}`,
        "& .MuiChip-icon": { color, fontSize: 15, ml: 0.75 },
        ...(onClick && {
          "&:hover": { bgcolor: alpha(color, 0.18) },
        }),
      }}
    />
  );
}
