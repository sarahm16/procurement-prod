// components/Tasks/employeeOptions.jsx
//
// Employee pickers that show each person's email, since people can have
// accounts in more than one tenant.
//
//   <Autocomplete options={people} {...employeeOptionProps(people, user?.id)} … />
//
// The option list shows name + email, and typing searches both. In the
// input and on chips, a name stands alone unless another employee has the
// same name; then the email's domain is added so the two can be told apart.
import { Box, createFilterOptions } from "@mui/material";

const filter = createFilterOptions({
  stringify: (o) => `${o.name} ${o.email ?? ""}`,
});

/** "mreyes@evergreenbrands.com" → "evergreenbrands" (short enough for a chip). */
const domainOf = (email) => {
  if (!email?.includes("@")) return email ?? "";
  const host = email.split("@")[1];
  return host.split(".").slice(0, -1).join(".") || host;
};

export function employeeOptionProps(people, currentUserId) {
  const counts = new Map();
  for (const p of people) {
    const k = p.name?.trim().toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const isDuplicate = (o) => (counts.get(o.name?.trim().toLowerCase()) ?? 0) > 1;

  const getOptionLabel = (o) => {
    const base = isDuplicate(o) && o.email ? `${o.name} (${domainOf(o.email)})` : o.name;
    return o.id === currentUserId ? `${base} · me` : base;
  };

  return {
    getOptionLabel,
    isOptionEqualToValue: (o, v) => o.id === v.id,
    filterOptions: filter,
    renderOption: (props, o) => {
      const { key, ...rest } = props;
      return (
        <Box component="li" key={o.id ?? key} {...rest} sx={{ display: "block !important", py: "6px !important" }}>
          <Box sx={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.3 }}>
            {o.name}
            {o.id === currentUserId && (
              <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
                {" "}
                (me)
              </Box>
            )}
          </Box>
          {o.email && (
            <Box sx={{ fontSize: "0.7rem", color: "text.secondary", lineHeight: 1.3, wordBreak: "break-all" }}>
              {o.email}
            </Box>
          )}
        </Box>
      );
    },
  };
}
