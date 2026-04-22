import { useState } from "react";
import { Box, Tab, Tabs, Badge, useTheme, alpha } from "@mui/material";
import NotesPanel from "./NotesPanel";

/**
 * DetailPageLayout
 *
 * Full detail page layout with:
 *  - Fixed header (passed in as prop)
 *  - Horizontal tab bar integrated at the bottom of the header
 *  - Scrollable tab content area
 *  - Persistent collapsible NotesPanel on the right
 *
 * Usage:
 *   <DetailPageLayout
 *     header={<DetailPageHeader ... />}
 *     tabs={[
 *       { label: "Details", content: <VendorDetails /> },
 *       { label: "Sites", badge: siteCount, content: <VendorSites /> },
 *       { label: "Work Orders", content: <VendorWorkOrders /> },
 *       { label: "Activity", content: <VendorActivity /> },
 *     ]}
 *     notes={notes}
 *     notesLoading={loading}
 *     onAddNote={handleAddNote}
 *     currentUser="Sarah Carter"
 *   />
 *
 * Props:
 *   header       {ReactNode}  — DetailPageHeader component
 *   tabs         {Array}      — [{ label, content, badge?, icon? }]
 *   notes        {Array}      — notes array passed to NotesPanel
 *   notesLoading {boolean}
 *   onAddNote    {fn}         — (content: string) => Promise<void>
 *   currentUser  {string}     — name shown on new notes
 */
export default function DetailPageLayout({
  header,
  tabs = [],
  notes = [],
  notesLoading = false,
  onAddNote,
  currentUser,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [activeTab, setActiveTab] = useState(0);

  const activeContent = tabs[activeTab]?.content ?? null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Fixed top: header + tab bar ──────────────────────────────────────── */}
      <Box sx={{ flexShrink: 0 }}>
        {/* Header */}
        {header}

        {/* Tab bar — sits flush against header bottom, no gap */}
        <Box
          sx={{
            backgroundColor: "background.paper",
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: { xs: 2.5, sm: 4 },
            // Negative margin to merge with the header's bottom border
            mt: "-1px",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            TabIndicatorProps={{
              style: {
                backgroundColor: theme.palette.secondary.main,
                height: 2,
                borderRadius: "2px 2px 0 0",
              },
            }}
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                fontFamily: '"Barlow", sans-serif',
                fontWeight: 500,
                fontSize: "0.78rem",
                letterSpacing: "0.04em",
                textTransform: "none",
                color: "text.secondary",
                minHeight: 40,
                px: 0,
                mr: 3,
                pb: 0,
                transition: "color 0.15s ease",
                "&:hover": {
                  color: "text.primary",
                },
                "&.Mui-selected": {
                  color: "text.primary",
                  fontWeight: 600,
                },
              },
            }}
          >
            {tabs.map((tab, i) => (
              <Tab
                key={i}
                disableRipple
                label={
                  tab.badge != null ? (
                    <Badge
                      badgeContent={tab.badge}
                      sx={{
                        "& .MuiBadge-badge": {
                          fontFamily: '"Barlow", sans-serif',
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          height: 16,
                          minWidth: 16,
                          padding: "0 4px",
                          backgroundColor:
                            activeTab === i
                              ? theme.palette.secondary.main
                              : alpha(theme.palette.text.secondary, 0.25),
                          color:
                            activeTab === i
                              ? "#fff"
                              : theme.palette.text.secondary,
                          top: -2,
                          right: -10,
                          transition: "all 0.15s ease",
                        },
                      }}
                    >
                      <Box sx={{ pr: 1.5 }}>{tab.label}</Box>
                    </Badge>
                  ) : (
                    tab.label
                  )
                }
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>
      </Box>

      {/* ── Body: tab content + notes panel ─────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {/* Scrollable tab content */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            px: { xs: 2.5, sm: 4 },
            py: 3,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: alpha(theme.palette.text.primary, 0.12),
              borderRadius: 3,
              "&:hover": { background: alpha(theme.palette.text.primary, 0.2) },
            },
          }}
        >
          {activeContent}
        </Box>

        {/* Persistent notes panel */}
        <NotesPanel
          notes={notes}
          loading={notesLoading}
          onAddNote={onAddNote}
          currentUser={currentUser}
        />
      </Box>
    </Box>
  );
}
