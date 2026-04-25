import { useMemo } from "react";
import {
  getGetUserPreferencesQueryKey,
  useGetUserPreferences,
} from "@workspace/api-client-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  DEFAULT_USER_PREFERENCES,
  resolveUserPreferences,
} from "@/lib/user-preferences";

export function useUserPreferences(enabled = true) {
  const { status } = useAuthSession();
  const query = useGetUserPreferences({
    query: {
      enabled: enabled && status === "ready",
      queryKey: getGetUserPreferencesQueryKey(),
      retry: 0,
      refetchOnWindowFocus: false,
    },
  });
  const preferences = useMemo(() => resolveUserPreferences(query.data), [query.data]);

  return {
    ...query,
    preferences,
    defaults: DEFAULT_USER_PREFERENCES,
  };
}
