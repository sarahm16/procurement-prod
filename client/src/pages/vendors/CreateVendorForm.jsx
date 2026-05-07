import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { usePlacesWidget } from "react-google-autocomplete";
import { useTrades } from "../../*/hooks/useTrades";

/**
 * VendorForm
 *
 * Drop this inside your "Create New Item" drawer body.
 *
 * Props:
 *  - trades:    array of { id, name } available trades for the multi-select
 *  - onSubmit:  (vendorPayload) => Promise|void  -- called with the form data
 *  - onClose:  () => void                       -- close the drawer
 *  - submitting: boolean                         -- disables buttons while in flight
 *
 * Notes:
 *  - sandbox defaults to true (per your request)
 *  - status_id defaults to 1
 *  - sarlaccId is intentionally omitted (only set on migrated vendors)
 *  - trade_ids is sent as an array of integers
 */

const SECTION_LABEL_SX = {
  fontFamily: '"Barlow Condensed", sans-serif',
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: "0.8rem",
  color: "text.secondary",
  mb: 1.5,
};

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const initialState = {
  company: "",
  sandbox: true,
  status_id: 1,
  contact_name: "",
  contact_phone: "",
  contact_phone2: "",
  contact_email: "",
  quickbooks_id: "",
  mailing_address: "",
  mailing_address2: "",
  mailing_city: "",
  mailing_state: "",
  mailing_zipcode: "",
  lat: null,
  lng: null,
  billing_address: "",
  billing_address2: "",
  billing_city: "",
  billing_state: "",
  billing_zipcode: "",
  trade_ids: [],
};

/**
 * Pulls the parts we care about out of a Google Place result.
 */
const parseGooglePlace = (place) => {
  const parts = {
    address: "",
    city: "",
    state: "",
    zipcode: "",
    lat: null,
    lng: null,
  };
  if (!place) return parts;

  let streetNumber = "";
  let route = "";

  (place.address_components || []).forEach((c) => {
    const t = c.types || [];
    if (t.includes("street_number")) streetNumber = c.long_name;
    if (t.includes("route")) route = c.long_name;
    if (t.includes("locality")) parts.city = c.long_name;
    // some addresses don't have locality - fall back to sublocality / postal_town
    if (!parts.city && t.includes("sublocality")) parts.city = c.long_name;
    if (!parts.city && t.includes("postal_town")) parts.city = c.long_name;
    if (t.includes("administrative_area_level_1")) parts.state = c.short_name;
    if (t.includes("postal_code")) parts.zipcode = c.long_name;
  });

  parts.address = `${streetNumber} ${route}`.trim();

  const loc = place.geometry?.location;
  if (loc) {
    parts.lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
    parts.lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  }

  return parts;
};

export default function VendorForm({ onSubmit, onClose, submitting = false }) {
  const [form, setForm] = useState(initialState);
  const [sameAsMailing, setSameAsMailing] = useState(false);
  const [errors, setErrors] = useState({});

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { data: trades = [] } = useTrades();
  console.log("Trades for VendorForm", trades);

  // Google Places: mailing
  const { ref: mailingAutocompleteRef } = usePlacesWidget({
    apiKey,
    onPlaceSelected: (place) => {
      const p = parseGooglePlace(place);
      setForm((prev) => ({
        ...prev,
        mailing_address: p.address,
        mailing_city: p.city,
        mailing_state: p.state,
        mailing_zipcode: p.zipcode,
        lat: p.lat,
        lng: p.lng,
        // mirror to billing if the user has "same as mailing" checked
        ...(sameAsMailing && {
          billing_address: p.address,
          billing_city: p.city,
          billing_state: p.state,
          billing_zipcode: p.zipcode,
        }),
      }));
    },
    options: {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry"],
    },
  });

  // Google Places: billing
  const { ref: billingAutocompleteRef } = usePlacesWidget({
    apiKey,
    onPlaceSelected: (place) => {
      const p = parseGooglePlace(place);
      setForm((prev) => ({
        ...prev,
        billing_address: p.address,
        billing_city: p.city,
        billing_state: p.state,
        billing_zipcode: p.zipcode,
      }));
    },
    options: {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry"],
    },
  });

  // When "same as mailing" is toggled on, copy current mailing values to billing.
  // When toggled off, leave whatever's there so the user can edit freely.
  useEffect(() => {
    if (sameAsMailing) {
      setForm((prev) => ({
        ...prev,
        billing_address: prev.mailing_address,
        billing_address2: prev.mailing_address2,
        billing_city: prev.mailing_city,
        billing_state: prev.mailing_state,
        billing_zipcode: prev.mailing_zipcode,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsMailing]);

  const setField = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleTradesChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      trade_ids:
        typeof value === "string" ? value.split(",").map(Number) : value,
    }));
  };

  const validate = () => {
    const next = {};
    if (!form.company.trim()) next.company = "Company name is required";
    if (form.contact_email && !/^\S+@\S+\.\S+$/.test(form.contact_email)) {
      next.contact_email = "Enter a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.(form);
    onClose?.();
  };

  const handleReset = () => {
    setForm(initialState);
    setSameAsMailing(false);
    setErrors({});
    onClose?.();
  };

  // Map trade id -> name for the multi-select chip rendering
  const tradeNameById = useMemo(() => {
    const map = new Map();
    trades.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [trades]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "100%",
      }}
    >
      {/* COMPANY ------------------------------------------------------- */}
      <Box>
        <Typography sx={SECTION_LABEL_SX}>Company</Typography>
        <Stack spacing={2}>
          <TextField
            label="Company Name"
            required
            fullWidth
            size="small"
            value={form.company}
            onChange={setField("company")}
            error={Boolean(errors.company)}
            helperText={errors.company}
          />
          <TextField
            label="QuickBooks ID"
            fullWidth
            size="small"
            value={form.quickbooks_id}
            onChange={setField("quickbooks_id")}
          />
        </Stack>
      </Box>

      <Divider />

      {/* CONTACT ------------------------------------------------------- */}
      <Box>
        <Typography sx={SECTION_LABEL_SX}>Primary Contact</Typography>
        <Stack spacing={2}>
          <TextField
            label="Contact Name"
            fullWidth
            size="small"
            value={form.contact_name}
            onChange={setField("contact_name")}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            size="small"
            value={form.contact_email}
            onChange={setField("contact_email")}
            error={Boolean(errors.contact_email)}
            helperText={errors.contact_email}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Phone"
              fullWidth
              size="small"
              value={form.contact_phone}
              onChange={setField("contact_phone")}
            />
            <TextField
              label="Alt. Phone"
              fullWidth
              size="small"
              value={form.contact_phone2}
              onChange={setField("contact_phone2")}
            />
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {/* MAILING ADDRESS ---------------------------------------------- */}
      <Box>
        <Typography sx={SECTION_LABEL_SX}>Mailing Address</Typography>
        <Stack spacing={2}>
          <TextField
            label="Search Address"
            placeholder="Start typing an address…"
            fullWidth
            size="small"
            inputRef={mailingAutocompleteRef}
            // value is uncontrolled here — the autocomplete owns the input;
            // we mirror the parsed pieces into the fields below.
            defaultValue=""
            helperText="Selecting a result fills in the fields below"
          />
          <TextField
            label="Street Address"
            fullWidth
            size="small"
            value={form.mailing_address}
            onChange={setField("mailing_address")}
            InputLabelProps={{ shrink: Boolean(form.mailing_address) }}
          />
          <TextField
            label="Apt / Suite / Unit"
            fullWidth
            size="small"
            value={form.mailing_address2}
            onChange={setField("mailing_address2")}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="City"
              fullWidth
              size="small"
              value={form.mailing_city}
              onChange={setField("mailing_city")}
              InputLabelProps={{ shrink: Boolean(form.mailing_city) }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel
                id="mailing-state-label"
                shrink={Boolean(form.mailing_state)}
              >
                State
              </InputLabel>
              <Select
                labelId="mailing-state-label"
                label="State"
                value={form.mailing_state}
                onChange={setField("mailing_state")}
                displayEmpty
              >
                <MenuItem value="">
                  <em>—</em>
                </MenuItem>
                {US_STATES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="ZIP"
              size="small"
              sx={{ width: 110 }}
              value={form.mailing_zipcode}
              onChange={setField("mailing_zipcode")}
              InputLabelProps={{ shrink: Boolean(form.mailing_zipcode) }}
            />
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {/* BILLING ADDRESS ---------------------------------------------- */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Typography sx={{ ...SECTION_LABEL_SX, mb: 0 }}>
            Billing Address
          </Typography>
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={sameAsMailing}
                onChange={(e) => setSameAsMailing(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ textTransform: "none" }}>
                Same as mailing
              </Typography>
            }
          />
        </Stack>

        {!sameAsMailing && (
          <Stack spacing={2}>
            <TextField
              label="Search Address"
              placeholder="Start typing an address…"
              fullWidth
              size="small"
              inputRef={billingAutocompleteRef}
              defaultValue=""
              helperText="Selecting a result fills in the fields below"
            />
            <TextField
              label="Street Address"
              fullWidth
              size="small"
              value={form.billing_address}
              onChange={setField("billing_address")}
              InputLabelProps={{ shrink: Boolean(form.billing_address) }}
            />
            <TextField
              label="Apt / Suite / Unit"
              fullWidth
              size="small"
              value={form.billing_address2}
              onChange={setField("billing_address2")}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="City"
                fullWidth
                size="small"
                value={form.billing_city}
                onChange={setField("billing_city")}
                InputLabelProps={{ shrink: Boolean(form.billing_city) }}
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel
                  id="billing-state-label"
                  shrink={Boolean(form.billing_state)}
                >
                  State
                </InputLabel>
                <Select
                  labelId="billing-state-label"
                  label="State"
                  value={form.billing_state}
                  onChange={setField("billing_state")}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>—</em>
                  </MenuItem>
                  {US_STATES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="ZIP"
                size="small"
                sx={{ width: 110 }}
                value={form.billing_zipcode}
                onChange={setField("billing_zipcode")}
                InputLabelProps={{ shrink: Boolean(form.billing_zipcode) }}
              />
            </Stack>
          </Stack>
        )}
      </Box>

      <Divider />

      {/* TRADES -------------------------------------------------------- */}
      <Box>
        <Typography sx={SECTION_LABEL_SX}>Trades</Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="trades-label">Select Trades</InputLabel>
          <Select
            labelId="trades-label"
            multiple
            value={form.trade_ids}
            onChange={handleTradesChange}
            input={<OutlinedInput label="Select Trades" />}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((id) => (
                  <Chip
                    key={id}
                    label={tradeNameById.get(id) || id}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
            MenuProps={{
              PaperProps: { style: { maxHeight: 320 } },
            }}
          >
            {trades.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Checkbox
                  checked={form.trade_ids.indexOf(t.id) > -1}
                  size="small"
                />
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* ACTIONS ------------------------------------------------------- */}
      <Box sx={{ flexGrow: 1 }} />
      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="flex-end"
        sx={{
          position: "sticky",
          bottom: 0,
          pt: 2,
          mt: "auto",
          backgroundColor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button
          variant="text"
          color="inherit"
          onClick={handleReset}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="secondary"
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create Vendor"}
        </Button>
      </Stack>
    </Box>
  );
}
