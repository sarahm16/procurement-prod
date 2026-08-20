import { useQuery } from "@tanstack/react-query";

export function useSoftwares() {
  return useQuery({
    queryKey: ["softwares"],
    queryFn: async () => {
      const response = await fetch("/api/softwares");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}
