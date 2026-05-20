import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";
import { useLocation, Navigate } from "react-router-dom";
import { Box, Button, Typography, Stack, Fade } from "@mui/material";
import logo from "../assets/logo.jpg"; // same logo as operations portal

// Official 4-square Microsoft mark — same as operations portal
function MicrosoftIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

// Upward-trending decorative stat pill shown in the branding panel
function StatPill({ value, label }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        px: 2.5,
        py: 1.5,
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(4px)",
        minWidth: 100,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.6rem",
          lineHeight: 1,
          color: "#FFFFFF",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Barlow", sans-serif',
          fontWeight: 600,
          fontSize: "0.62rem",
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.65)",
          mt: 0.4,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function SalesLoginPage() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = () => {
    instance.loginRedirect({ ...loginRequest, state: from });
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        // Panel order is REVERSED vs. operations portal:
        // sign-in column on the LEFT, branding panel on the RIGHT
        flexDirection: "row",
      }}
    >
      {/* ───────── Left: sign-in column ───────── */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 45%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 6 },
          // Subtle upward-angle clip on the right edge (desktop only)
          clipPath: {
            xs: "none",
            md: "polygon(0 0, 100% 0, calc(100% - 32px) 100%, 0 100%)",
          },
          position: "relative",
          zIndex: 1,
          bgcolor: "background.paper",
        }}
      >
        <Fade in timeout={700}>
          <Box sx={{ width: "100%", maxWidth: 400 }}>
            {/* Logo — same as operations portal */}
            <Box
              component="img"
              src={logo}
              alt="National Facility Contractors"
              sx={{
                height: { xs: 44, sm: 52 },
                width: "auto",
                mb: 6,
                display: "block",
              }}
            />

            {/* App identifier badge — amber accent to echo the right panel */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  bgcolor: "secondary.main",
                  borderRadius: "1px",
                  transform: "rotate(45deg)",
                }}
              />
              <Typography
                variant="overline"
                sx={{
                  color: "secondary.main",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  letterSpacing: "0.1em",
                }}
              >
                Sales Portal
              </Typography>
            </Stack>

            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontSize: "0.7rem",
                display: "block",
                mb: 1,
              }}
            >
              Welcome back
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "1.9rem", sm: "2.35rem" },
                lineHeight: 1.05,
                mb: 1.5,
                color: "text.primary",
              }}
            >
              Sign in to your account
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: "0.95rem",
                lineHeight: 1.55,
                mb: 4,
              }}
            >
              Use your company Microsoft account to access the sales portal.
            </Typography>

            {/* SSO button — uses secondary (amber) colour instead of primary navy
                so it immediately reads as a different app on the same brand */}
            <Button
              onClick={handleLogin}
              variant="contained"
              size="large"
              fullWidth
              startIcon={<MicrosoftIcon size={18} />}
              sx={{
                py: 1.6,
                fontSize: "0.82rem",
                bgcolor: "secondary.main",
                "&:hover": { bgcolor: "secondary.dark" },
              }}
            >
              Sign in with Microsoft
            </Button>

            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "block",
                  lineHeight: 1.6,
                }}
              >
                Trouble signing in? Contact your IT administrator at{" "}
                <Box
                  component="a"
                  href="mailto:it@nationalfacility.com"
                  sx={{
                    color: "secondary.main",
                    textDecoration: "none",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  it@nationalfacility.com
                </Box>
                .
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Box>

      {/* ───────── Right: branding panel (hidden on small screens) ───────── */}
      {/*
        Key visual differences vs. operations portal:
          • Amber-orange gradient instead of navy — flips the colour hierarchy
          • Diagonal momentum-stripe texture instead of blueprint grid
          • Stat pills instead of word-mark badges
          • Copy focuses on revenue / pipeline, not crews / work orders
      */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: "1 1 55%",
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          p: { md: 5, lg: 7 },
          color: "primary.contrastText",
          // Amber-to-rust gradient (inverted colour role vs. operations navy)
          background: (t) =>
            `linear-gradient(145deg, ${t.palette.secondary.dark} 0%, ${t.palette.secondary.main} 55%, #F0A060 100%)`,
        }}
      >
        {/* Diagonal momentum stripes (replaces blueprint grid) */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage: `repeating-linear-gradient(
              -55deg,
              #fff 0px,
              #fff 1px,
              transparent 1px,
              transparent 38px
            )`,
          }}
        />

        {/* Soft navy counter-accent (inverted from operations' amber accent) */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            bottom: "-20%",
            left: "-20%",
            width: "60%",
            height: "80%",
            borderRadius: "50%",
            background: (t) =>
              `radial-gradient(ellipse at center, ${t.palette.primary.dark}44 0%, transparent 70%)`,
          }}
        />

        {/* Top badge */}
        <Fade in timeout={500}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ position: "relative" }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                bgcolor: "rgba(255,255,255,0.9)",
                borderRadius: "2px",
              }}
            />
            <Typography
              variant="overline"
              sx={{
                color: "rgba(255,255,255,0.85)",
                fontWeight: 700,
                fontSize: "0.78rem",
              }}
            >
              NFC&nbsp;&nbsp;//&nbsp;&nbsp;Sales Portal
            </Typography>
          </Stack>
        </Fade>

        {/* Hero copy */}
        <Fade in timeout={900}>
          <Box sx={{ position: "relative", maxWidth: 520 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { md: "3.25rem", lg: "4.25rem" },
                lineHeight: 0.95,
                textTransform: "uppercase",
                mb: 3,
              }}
            >
              Fuel your
              <Box
                component="span"
                sx={{
                  // Navy call-out text on amber panel —
                  // the inverse of the operations portal's amber-on-navy
                  color: (t) => t.palette.primary.dark,
                  display: "block",
                }}
              >
                pipeline.
              </Box>
              Close every deal.
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.82)",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                maxWidth: 440,
              }}
            >
              Track opportunities, manage accounts, and forecast revenue across
              every territory — all in one secure place.
            </Typography>

            {/* Ambient stat pills — give a "performance dashboard" feel */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 4, flexWrap: "wrap", gap: 2 }}
            >
              <StatPill value="94%" label="Quota attained" />
              <StatPill value="↑ 18%" label="Pipeline growth" />
              <StatPill value="3.2×" label="Avg. deal velocity" />
            </Stack>
          </Box>
        </Fade>

        {/* Bottom legal strip */}
        <Fade in timeout={1200}>
          <Stack
            direction="row"
            spacing={2.5}
            sx={{ position: "relative", color: "rgba(255,255,255,0.55)" }}
          >
            <Typography variant="caption" sx={{ letterSpacing: "0.12em" }}>
              SECURE
            </Typography>
            <Typography variant="caption">·</Typography>
            <Typography variant="caption" sx={{ letterSpacing: "0.12em" }}>
              SSO ENABLED
            </Typography>
            <Typography variant="caption">·</Typography>
            <Typography variant="caption" sx={{ letterSpacing: "0.12em" }}>
              © {new Date().getFullYear()} NATIONAL FACILITY CONTRACTORS
            </Typography>
          </Stack>
        </Fade>
      </Box>
    </Box>
  );
}

export default SalesLoginPage;
