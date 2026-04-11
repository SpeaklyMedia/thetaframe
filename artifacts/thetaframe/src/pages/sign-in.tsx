import { SignIn } from "@clerk/react";
import { Layout } from "@/components/layout";

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const homeRedirectUrl = `${basePath || ""}/`;

  return (
    <Layout>
      <div className="auth-shell flex-1 flex flex-col items-center justify-center px-4 py-12 gap-4">
        <div className="w-full max-w-md rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <p className="font-medium text-foreground">Use your email to sign in.</p>
          <p className="mt-1">
            Google sign-in is disabled on this lane while production auth finishes settling. Enter your ThetaFrame email and continue with your account credentials.
          </p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={homeRedirectUrl} />
      </div>
    </Layout>
  );
}
