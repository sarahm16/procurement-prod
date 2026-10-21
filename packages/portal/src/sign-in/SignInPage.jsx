// @sarlacc/portal · src/sign-in/SignInPage.jsx
//
// Two steps: enter your email → enter the 6-digit code we emailed.
// Shared by every portal; the words come from the app's config:
//
//   <SignInPage config={config} />
//
//   config = {
//     name: "Vendor Portal",
//     headline: ["Your work orders,", "in one place."],   // second part in orange
//     blurb: "…",
//     points: [{ icon: SomeMuiIcon, text: "…" }, …],
//     emailHint: "Enter the email your company uses with NFC.",
//     helpText: "Need access? Contact your NFC coordinator.",
//   }
//
// Wide screens: a navy brand panel on the left, the form on the right.
// Phones: a short navy band on top, the form below it.
import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Link,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import CodeInput from "./CodeInput.jsx";
import { useAuth } from "../auth/useAuth.js";
import { errorMessage } from "../auth/api.js";

const RESEND_SECONDS = 30;

/** Placeholder mark until there's a real logo file in /public. */
function BrandMark({ size = 40 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        bgcolor: "secondary.main",
        color: "secondary.contrastText",
        display: "grid",
        placeItems: "center",
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 700,
        fontSize: size * 0.42,
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      NFC
    </Box>
  );
}

/** The navy side: full panel on wide screens, a short band on phones. */
function BrandPanel({ config }) {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const bg = dark ? "#0C1520" : theme.palette.primary.main;

  return (
    <Box
      sx={{
        bgcolor: bg,
        color: "#fff",
        px: { xs: 2.5, md: 6 },
        py: { xs: 2.5, md: 6 },
        display: "flex",
        flexDirection: "column",
        borderRight: {
          md: dark ? `1px solid ${theme.palette.divider}` : "none",
        },
        // A faint grid, like a site plan, so the panel isn't a flat block.
        backgroundImage: {
          md: `linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)`,
        },
        backgroundSize: { md: "32px 32px" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <BrandMark size={36} />
        <Box>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              lineHeight: 1.2,
              opacity: 0.7,
              fontSize: "0.68rem",
            }}
          >
            NFC
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              fontSize: "1.2rem",
              lineHeight: 1.1,
            }}
          >
            {config.name}
          </Typography>
        </Box>
      </Box>

      {/* Wide screens only: the pitch. */}
      <Box sx={{ display: { xs: "none", md: "block" }, my: "auto", pt: 6 }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: { md: "2.75rem", lg: "3.25rem" },
            lineHeight: 1.05,
            mb: 2,
            maxWidth: 440,
          }}
        >
          {config.headline[0]}{" "}
          <Box
            component="span"
            sx={{ color: "secondary.main", whiteSpace: "nowrap" }}
          >
            {config.headline[1]}
          </Box>
        </Typography>
        <Typography
          sx={{ opacity: 0.75, fontSize: "1.05rem", maxWidth: 400, mb: 4 }}
        >
          {config.blurb}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {config.points.map((point) => {
            const PointIcon = point.icon;
            return (
              <Box
                key={point.text}
                sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,.08)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <PointIcon sx={{ fontSize: 19, color: "secondary.light" }} />
                </Box>
                <Typography sx={{ fontSize: "0.95rem", opacity: 0.9 }}>
                  {point.text}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Typography
        sx={{
          display: { xs: "none", md: "block" },
          fontSize: "0.8rem",
          opacity: 0.5,
        }}
      >
        © {new Date().getFullYear()} NFC
      </Typography>
    </Box>
  );
}

export default function SignInPage({ config }) {
  const { status, requestCode, verifyCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = location.state?.from?.pathname ?? "/";

  const [stage, setStage] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (status === "signedIn") return <Navigate to={goTo} replace />;

  const cleanEmail = email.trim().toLowerCase();

  const sendCode = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestCode(cleanEmail);
      const resend = stage === "code";
      setStage("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
      if (resend) setNotice("We sent a new code.");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await verifyCode(cleanEmail, value);
      navigate(goTo, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 50);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(380px, 46%) 1fr" },
        gridTemplateRows: { xs: "auto 1fr", md: "1fr" },
        bgcolor: "background.default",
      }}
    >
      <BrandPanel config={config} />

      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "center",
          px: { xs: 2.5, sm: 4 },
          pt: { xs: 5, md: 4 },
          pb: 4,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {stage === "email" ? (
            <Box component="form" onSubmit={sendCode} noValidate>
              <Typography variant="overline" sx={{ color: "secondary.main" }}>
                Welcome back
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: "2rem", sm: "2.25rem" }, mb: 1 }}
              >
                Sign in
              </Typography>
              <Typography sx={{ color: "text.secondary", mb: 3.5 }}>
                {config.emailHint} We'll send you a 6-digit code. No password
                needed.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Email address"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{
                  htmlInput: { inputMode: "email", style: { fontSize: 16 } },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlineIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 2.5 }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy || !cleanEmail}
                sx={{ py: 1.5, fontSize: "0.85rem" }}
              >
                {busy ? "Sending…" : "Email me a code"}
              </Button>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                submitCode();
              }}
              noValidate
            >
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setStage("email");
                  setError(null);
                  setNotice(null);
                  setCode("");
                }}
                sx={{ ml: -1.5, mb: 1.5, color: "text.secondary" }}
              >
                Change email
              </Button>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: "2rem", sm: "2.25rem" }, mb: 1 }}
              >
                Check your email
              </Typography>
              <Typography sx={{ color: "text.secondary", mb: 3.5 }}>
                If{" "}
                <Box component="strong" sx={{ color: "text.primary" }}>
                  {cleanEmail}
                </Box>{" "}
                has portal access, we sent it a 6-digit code. It works for 10
                minutes.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {notice && !error && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {notice}
                </Alert>
              )}

              <CodeInput
                ref={codeRef}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (error) setError(null);
                }}
                onComplete={submitCode}
                error={Boolean(error)}
                disabled={busy}
                autoFocus
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={busy || code.length !== 6}
                sx={{ mt: 2.5, py: 1.5, fontSize: "0.85rem" }}
              >
                {busy ? "Checking…" : "Sign in"}
              </Button>

              <Typography
                sx={{
                  mt: 2.5,
                  fontSize: "0.9rem",
                  color: "text.secondary",
                  textAlign: "center",
                }}
              >
                Didn't get it? Check your spam folder, or{" "}
                {cooldown > 0 ? (
                  <Box component="span" sx={{ color: "text.disabled" }}>
                    resend in {cooldown}s
                  </Box>
                ) : (
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={sendCode}
                    disabled={busy}
                    sx={{ verticalAlign: "baseline", fontSize: "inherit" }}
                  >
                    send a new code
                  </Link>
                )}
                .
              </Typography>
            </Box>
          )}

          <Typography
            sx={{
              mt: 5,
              pt: 2.5,
              borderTop: 1,
              borderColor: "divider",
              fontSize: "0.85rem",
              color: "text.secondary",
            }}
          >
            {config.helpText}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
