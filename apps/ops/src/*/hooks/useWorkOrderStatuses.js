import { useQuery } from "@tanstack/react-query";

export function useWorkOrderStatuses() {
  return useQuery({
    queryKey: ["workOrderStatuses"],
    queryFn: async () => {
      const response = await fetch("/api/workorders/statuses");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}
