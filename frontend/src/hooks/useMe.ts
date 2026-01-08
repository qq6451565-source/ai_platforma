import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "../api/user";
import { getAccessToken } from "../utils/token";

export const useMe = () => {
  const token = getAccessToken();
  return useQuery({
    queryKey: ["me", token],
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
