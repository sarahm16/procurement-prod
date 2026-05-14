import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";
import { useLocation, Navigate } from "react-router-dom";
import { Box, Button, Typography, Stack, Fade } from "@mui/material";
import logo from "../assets/logo.jpg"; // adjust path to wherever your logo lives

// Official 4-square Microsoft mark for the SSO button
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

function LoginPage() {
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
      }}
    >
      {/* ───────── Left: branding panel (hidden on small screens) ───────── */}
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
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        {/* Blueprint grid texture */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.07,
            backgroundImage: `
              linear-gradient(#fff 1px, transparent 1px),
              linear-gradient(90deg, #fff 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Soft amber diagonal accent */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: "-25%",
            right: "-30%",
            width: "70%",
            height: "140%",
            background: (t) =>
              `linear-gradient(135deg, transparent 46%, ${t.palette.secondary.main}33 50%, transparent 54%)`,
          }}
        />

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
                bgcolor: "secondary.main",
                borderRadius: "2px",
              }}
            />
            <Typography
              variant="overline"
              sx={{
                color: "secondary.light",
                fontWeight: 700,
                fontSize: "0.78rem",
              }}
            >
              NFC&nbsp;&nbsp;//&nbsp;&nbsp;Operations Portal
            </Typography>
          </Stack>
        </Fade>

        <Fade in timeout={900}>
          <Box sx={{ position: "relative", maxWidth: 540 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { md: "3.25rem", lg: "4.25rem" },
                lineHeight: 0.95,
                textTransform: "uppercase",
                mb: 3,
              }}
            >
              Building
              <Box
                component="span"
                sx={{ color: "secondary.main", display: "block" }}
              >
                reliability
              </Box>
              into every facility.
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.78)",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                maxWidth: 460,
              }}
            >
              Coordinate projects, dispatch crews, and track work orders across
              every site — all in one secure place.
            </Typography>
          </Box>
        </Fade>

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

      {/* ───────── Right: sign-in column ───────── */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 45%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 6 },
        }}
      >
        <Fade in timeout={700}>
          <Box sx={{ width: "100%", maxWidth: 400 }}>
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
              Use your company Microsoft account to access the operations
              portal.
            </Typography>

            <Button
              onClick={handleLogin}
              variant="contained"
              size="large"
              fullWidth
              startIcon={<MicrosoftIcon size={18} />}
              sx={{
                py: 1.6,
                fontSize: "0.82rem",
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
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
                    color: "primary.main",
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
    </Box>
  );
}

export default LoginPage;
