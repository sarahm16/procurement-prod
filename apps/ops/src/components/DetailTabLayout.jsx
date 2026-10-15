// components/DetailTabLayout.jsx
//
// The Details tab on every detail page: a narrow side column for reference
// facts (Team always first, then the record's info and addresses) and a wide
// main column for the work. The columns stack independently, so a tall card
// never leaves a hole beside it.
//
//   <DetailTabLayout
//     side={<><TeamCard … /><InfoCard title="Site info">…</InfoCard></>}
//     main={<><SiteServiceLinesCard /><Contacts … /></>}
//   />
//
// It responds to the width it actually has (a container query), not the
// window, so opening the notes panel stacks it before cards get cramped.
// Stacked, the side column comes first, so Team stays at the top.
//
// Props:
//   side, main     nodes
//   top            node, full width above both (an error alert, say)
//   sidePosition   "left" (default) | "right"
import { Box } from "@mui/material";

const Column = ({ children, area }) => (
  <Box
    sx={{
      gridArea: area,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0,
      containerType: "inline-size",
    }}
  >
    {children}
  </Box>
);

export default function DetailTabLayout({
  side,
  main,
  top,
  sidePosition = "left",
}) {
  return (
    <Box sx={{ containerType: "inline-size", pb: 4 }}>
      {top && <Box sx={{ mb: 2 }}>{top}</Box>}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "start",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateAreas: '"side" "main"',
          "@container (min-width: 720px)": {
            gridTemplateColumns:
              sidePosition === "left"
                ? "clamp(320px, 36%, 400px) minmax(0, 1fr)"
                : "minmax(0, 1fr) clamp(320px, 36%, 400px)",
            gridTemplateAreas:
              sidePosition === "left" ? '"side main"' : '"main side"',
          },
        }}
      >
        <Column area="side">{side}</Column>
        <Column area="main">{main}</Column>
      </Box>
    </Box>
  );
}

/** Two small cards side by side inside the main column, when it's wide enough. */
export function CardPair({ children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        alignItems: "start",
        gridTemplateColumns: "minmax(0, 1fr)",
        "@container (min-width: 640px)": {
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        },
      }}
    >
      {children}
    </Box>
  );
}
