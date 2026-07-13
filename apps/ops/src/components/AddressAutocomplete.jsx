// components/AddressAutocomplete.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { loadGoogleMaps } from "../*/utilities/googleMapsLoader";
import { parseAddressComponents } from "../*/utilities/parseAddress";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function debounce(fn, wait) {
  let t;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  d.cancel = () => clearTimeout(t);
  return d;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  apiKey = GOOGLE_MAPS_API_KEY,
  label,
  placeholder = "Start typing an address…",
  countryRestriction, // e.g. ["us", "ca"]
  sx,
  size = "small",
}) {
  const [ready, setReady] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");
  const [options, setOptions] = useState([]); // AutocompleteSuggestion[]
  const [loading, setLoading] = useState(false);

  const placesLibRef = useRef(null); // the imported "places" library
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!apiKey) {
      console.error("AddressAutocomplete: missing Google Maps API key");
      return;
    }
    let active = true;
    loadGoogleMaps(apiKey)
      .then((places) => {
        if (!active) return;
        placesLibRef.current = places;
        sessionRef.current = new places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((e) => console.error(e));
    return () => {
      active = false;
    };
  }, [apiKey]);

  useEffect(() => setInputValue(value ?? ""), [value]);

  const fetchPredictions = useMemo(
    () =>
      debounce(async (input, cb) => {
        const places = placesLibRef.current;
        if (!places || !input) return cb([]);
        try {
          const { suggestions } =
            await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input,
              sessionToken: sessionRef.current,
              ...(countryRestriction
                ? { includedRegionCodes: countryRestriction }
                : {}),
            });
          // Keep only address-like predictions.
          cb((suggestions || []).filter((s) => s.placePrediction));
        } catch (e) {
          console.error("fetchAutocompleteSuggestions failed:", e);
          cb([]);
        }
      }, 300),
    [countryRestriction],
  );

  useEffect(() => {
    if (!ready) return;
    if (!inputValue) return setOptions([]);
    setLoading(true);
    fetchPredictions(inputValue, (preds) => {
      setOptions(preds);
      setLoading(false);
    });
  }, [inputValue, ready, fetchPredictions]);

  const handleSelect = async (suggestion) => {
    const prediction = suggestion?.placePrediction;
    if (!prediction) return;
    try {
      // toPlace() gives a Place; fetch only the fields we need.
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["addressComponents", "location", "formattedAddress"],
      });

      // New Place returns addressComponents with { types, longText, shortText }.
      // Normalize to the { types, long_name } shape parseAddressComponents expects.
      const normalized = (place.addressComponents || []).map((c) => ({
        types: c.types,
        long_name: c.longText,
        short_name: c.shortText,
      }));

      onSelect?.({
        ...parseAddressComponents(normalized),
        formatted: place.formattedAddress,
        lat: place.location?.lat(),
        lng: place.location?.lng(),
      });
    } catch (e) {
      console.error("Place.fetchFields failed:", e);
    } finally {
      // Fresh session token after a completed selection (billing best practice).
      const places = placesLibRef.current;
      if (places) sessionRef.current = new places.AutocompleteSessionToken();
    }
  };

  const labelFor = (suggestion) => {
    const p = suggestion?.placePrediction;
    if (!p) return "";
    const main = p.mainText?.text ?? "";
    const secondary = p.secondaryText?.text ?? "";
    return [main, secondary].filter(Boolean).join(", ");
  };

  return (
    <Autocomplete
      fullWidth
      size={size}
      freeSolo
      autoComplete
      includeInputInList
      filterOptions={(x) => x} // Google already ranked/filtered
      options={options}
      loading={loading}
      inputValue={inputValue}
      getOptionLabel={(o) => (typeof o === "string" ? o : labelFor(o))}
      isOptionEqualToValue={(a, b) =>
        a?.placePrediction?.placeId === b?.placePrediction?.placeId
      }
      onInputChange={(e, next, reason) => {
        setInputValue(next);
        if (reason === "input") onChange?.(next);
        if (reason === "clear") {
          onChange?.("");
          setOptions([]);
        }
      }}
      onChange={(e, next) => {
        if (next && typeof next !== "string") handleSelect(next);
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={option.placePrediction?.placeId} {...rest}>
            {labelFor(option)}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="outlined"
          sx={sx}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
