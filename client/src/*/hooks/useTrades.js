import { useQuery } from "@tanstack/react-query";

export function useTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: async () => {
      const response = await fetch("/api/trades");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}
