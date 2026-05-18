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

export default function ListPageLayout({ header, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%", // fills the scrollable main box in PageLayout
        overflow: "hidden", // prevent this container itself from scrolling
      }}
    >
      {/* Fixed header — never scrolls */}
      <Box sx={{ flexShrink: 0 }}>{header}</Box>

      {/* Scrollable content area */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          px: { xs: 2, sm: 3 },
          pb: 4,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
