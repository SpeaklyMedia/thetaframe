import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <p className="text-6xl">🌀</p>
        <h1 className="text-2xl font-bold tracking-tight">Lost in the theta waves</h1>
        <p className="text-muted-foreground max-w-sm">
          This page doesn't exist. Let's get you back to a frame that does.
        </p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </Layout>
  );
}
