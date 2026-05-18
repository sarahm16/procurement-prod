import { useQuery } from "@tanstack/react-query";

export function useVendorStatuses() {
  return useQuery({
    queryKey: ["vendorStatuses"],
    queryFn: async () => {
      const response = await fetch("/api/vendorStatuses");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}
