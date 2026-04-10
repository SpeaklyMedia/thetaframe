import { useUser } from "@clerk/react";
import { useGetMyPermissions, getGetMyPermissionsQueryKey } from "@workspace/api-client-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { userIsOwner } from "@/lib/owner";

export function usePermissions() {
  const { user } = useUser();
  const { status } = useAuthSession();

  const { data, isLoading, isError } = useGetMyPermissions({
    query: {
      enabled: !!user && status === "ready",
      queryKey: getGetMyPermissionsQueryKey(),
      staleTime: 30_000,
    },
  });

  const modules: string[] = data?.modules ?? [];
  const environment: string = data?.environment ?? "development";
  const isAdmin = Boolean(data?.isAdmin) || userIsOwner(user);

  const hasModule = (module: string): boolean => {
    if (!user) return false;
    if (isLoading || isError) return true;
    return modules.includes(module);
  };

  return { modules, environment, hasModule, isAdmin, isLoading, isError };
}
