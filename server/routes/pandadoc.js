// routes/pandadoc.js
import express from "express";
import crypto from "crypto";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  storeUserTokens,
} from "../services/pandadoc/oauth.js";

const router = express.Router();

// In-memory state store (maps random state → employee id).
// For a single always-on server this is fine; see note on alternatives.
const pendingStates = new Map();

// GET /api/pandadoc/oauth/initiate
// Called when a user connects their PandaDoc account.
router.get("/oauth/initiate/:employeeId", (req, res) => {
  const { employeeId } = req.params;
  //   const employeeId = req.user?.id; // from your auth middleware
  if (!employeeId) return res.status(401).json({ error: "Not authenticated" });

  // random state token mapped to the user — prevents CSRF and carries identity
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, {
    employeeId: Number(employeeId),
    createdAt: Date.now(),
  });

  res.redirect(buildAuthUrl(state));
});

// GET /api/pandadoc/oauth/callback
// PandaDoc redirects the user's browser here after they approve.
router.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query;

  // validate state — must match one we issued
  const entry = pendingStates.get(state);
  if (!entry) {
    return res.status(400).send("Invalid or expired OAuth state");
  }
  pendingStates.delete(state); // one-time use

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeUserTokens(entry.employeeId, tokens);

    // send the user back into the app
    // res.redirect(`${process.env.FRONTEND_URL}/vendors?pandadoc=connected`);

    res.redirect(
      "https://sarlacc-server-htfaarfvczc0hrgv.westus2-01.azurewebsites.net/api/vendors",
    );

    // res.redirect(`http://localhost:5174/vendors`);
  } catch (err) {
    console.error("PandaDoc OAuth callback error:", err.response?.data ?? err);
    res.redirect(`${process.env.FRONTEND_URL}/vendors?pandadoc=error`);
  }
});

export default router;
