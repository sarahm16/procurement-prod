// src/api.js — requests to this portal's server routes, e.g.
// api.get("/work-orders") → GET /api/portal/work-orders
import { createApi } from "./portal";
import { PORTAL } from "./portalConfig";

const api = createApi(PORTAL.apiBase);
export default api;
