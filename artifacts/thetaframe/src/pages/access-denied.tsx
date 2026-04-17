import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { getPreferredRoute } from "@/lib/navigation";

export default function AccessDeniedPage() {
  const { modules, isAdmin } = usePermissions();
  const fallbackHref = getPreferredRoute(modules, isAdmin);
  const fallbackLabel = fallbackHref === "/admin" ? "Back to Admin" : "Go to your active lane";

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center flex-1 py-24 px-4 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-access-denied">
            This lane is not enabled for your account
          </h1>
          <p className="text-muted-foreground text-sm">
            This lane is not included in your current access level. Ask an Admin to grant this module if it belongs in your workspace.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={fallbackHref}>{fallbackLabel}</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
