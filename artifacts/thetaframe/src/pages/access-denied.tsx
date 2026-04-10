import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AccessDeniedPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center flex-1 py-24 px-4 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-access-denied">
            This lane is not enabled for your account
          </h1>
          <p className="text-muted-foreground text-sm">
            You are signed in, but this part of ThetaFrame has not been granted to you. Contact your administrator if you need access.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/daily">Back to Daily Frame</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
