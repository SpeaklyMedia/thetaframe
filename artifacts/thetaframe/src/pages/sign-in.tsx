import { SignIn } from "@clerk/react";
import { Layout } from "@/components/layout";

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const dailyRedirectUrl = `${basePath}/daily`;

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={dailyRedirectUrl} />
      </div>
    </Layout>
  );
}
