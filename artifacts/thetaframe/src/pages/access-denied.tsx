import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AccessDeniedPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center flex-1 py-24 px-4 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-access-denied">
            Access not granted
          </h1>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view this module. Contact your administrator to request access.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/daily">Back to Daily Frame</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
