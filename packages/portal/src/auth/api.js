// @sarlacc/portal · src/auth/api.js
//
// createApi("/api/portal") → an axios instance for one portal's server
// routes. Sends the sign-in cookie with every request. If any request
// (other than the sign-in ones) comes back 401, it tells the AuthProvider,
// which sends the person to the sign-in page.
import axios from "axios";

export const SIGNED_OUT_EVENT = "portal:signed-out";

export function createApi(baseURL) {
  const api = axios.create({ baseURL, withCredentials: true });
  api.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url ?? "";
      // /auth routes handle their own errors (a wrong code isn't "signed out").
      if (status === 401 && !url.startsWith("/auth/")) {
        window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
      }
      return Promise.reject(error);
    },
  );
  return api;
}

/** The server's { error } message, or a fallback. */
export const errorMessage = (
  e,
  fallback = "Something went wrong. Try again.",
) => e?.response?.data?.error ?? fallback;
