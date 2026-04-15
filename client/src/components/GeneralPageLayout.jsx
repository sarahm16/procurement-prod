/**
 * GeneralPageLayout
 *
 *
 * Usage:
 *   <GeneralPageLayout header={<DetailPageHeader ... />}>
 *     <YourPageContent />
 *   </GeneralPageLayout>
 */

// MUI Components
import Box from "@mui/material/Box";

export default function GeneralPageLayout({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%", // fills the scrollable main box in PageLayout
        overflow: "hidden", // prevent this container itself from scrolling
      }}
    >
      {/* Scrollable content area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: { xs: 2, sm: 3 },
          pb: 4,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
