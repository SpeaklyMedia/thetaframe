import { useUser } from "@clerk/react";
import { useGetMyPermissions, getGetMyPermissionsQueryKey } from "@workspace/api-client-react";

export function usePermissions() {
  const { user } = useUser();

  const { data, isLoading } = useGetMyPermissions({
    query: {
      enabled: !!user,
      queryKey: getGetMyPermissionsQueryKey(),
      staleTime: 30_000,
    },
  });

  const modules: string[] = data?.modules ?? [];
  const environment: string = data?.environment ?? "development";

  const hasModule = (module: string): boolean => {
    if (!user) return false;
    if (isLoading) return true;
    return modules.includes(module);
  };

  const isAdmin = (): boolean => {
    if (!user) return false;
    const meta = user.publicMetadata as Record<string, unknown>;
    return meta?.role === "admin";
  };

  return { modules, environment, hasModule, isAdmin: isAdmin(), isLoading };
}
