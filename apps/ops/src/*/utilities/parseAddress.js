// utils/parseAddress.js
export function parseAddressComponents(components = []) {
  const get = (type) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? c.long_name : "";
  };
  const street = get("street_number");
  const route = get("route");
  const city = get("locality") || get("administrative_area_level_3");

  return {
    address: street && route ? `${street} ${route}` : route,
    city,
    state: get("administrative_area_level_1"), // long_name → "Washington", matches your data
    zipcode: get("postal_code"),
  };
}
