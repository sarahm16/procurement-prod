// portal/AuthProvider.jsx
//
// Knows whether someone is signed in, and who. On load it asks the server
// (GET /auth/me); the cookie itself can't be read from JavaScript.
//
//   const { status, user, requestCode, verifyCode, signOut } = useAuth();
//   (useAuth is in ./useAuth.js)
//   status: "loading" | "signedIn" | "signedOut"
//   user:   from the server's /auth/me (vendor: user.vendor, client: user.client)
//
//   <AuthProvider api={api}>…</AuthProvider>   (api from createApi)
import { useCallback, useEffect, useMemo, useState } from "react";
import { SIGNED_OUT_EVENT } from "./api";
import { AuthContext } from "./authContext";

export function AuthProvider({ api, children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  const signedOut = useCallback(() => {
    setUser(null);
    setStatus("signedOut");
  }, []);

  // Who's signed in, if anyone.
  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        setStatus("signedIn");
      })
      .catch(signedOut);
  }, [api, signedOut]);

  // Any other request that comes back 401 means the session ended.
  useEffect(() => {
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  }, [signedOut]);

  /** Email a code. Resolves the same whether or not the email has access. */
  const requestCode = useCallback(
    (email) => api.post("/auth/request-code", { email }),
    [api],
  );

  /** Check the code; on success the server sets the cookie. */
  const verifyCode = useCallback(
    async (email, code) => {
      const { data } = await api.post("/auth/verify-code", { email, code });
      setUser(data.user);
      setStatus("signedIn");
      return data.user;
    },
    [api],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/sign-out");
    } finally {
      signedOut();
    }
  }, [api, signedOut]);

  const value = useMemo(
    () => ({ status, user, requestCode, verifyCode, signOut }),
    [status, user, requestCode, verifyCode, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
