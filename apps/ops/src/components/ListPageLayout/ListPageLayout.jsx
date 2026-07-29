/**
 * ListPageLayout
 *
 * Fixes the DetailPageHeader in place and makes the content
 * below it scroll vertically. Use this as the root wrapper
 * on all detail pages (SiteDetail, ClientDetail, etc.)
 *
 * Usage:
 *   <DetailPageLayout header={<DetailPageHeader ... />}>
 *     <YourPageContent />
 *   </DetailPageLayout>
 */

// MUI Components
import Box from "@mui/material/Box";

export default function ListPageLayout({ header, toolbar, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Fixed header — never scrolls */}
      {header && <Box sx={{ flexShrink: 0 }}>{header}</Box>}

      {/* Content column: toolbar (natural height) + grid (fills rest) */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          px: { xs: 2, sm: 3 },
          pt: 2,
          // NOTE: no pb here — the grid's own footer is the bottom edge.
        }}
      >
        {/* Filter/search toolbar — takes only the height it needs */}
        {toolbar && <Box sx={{ flexShrink: 0, mb: 2 }}>{toolbar}</Box>}

        {/* Grid fills whatever vertical space remains */}
        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>{children}</Box>
      </Box>
    </Box>
  );
}
