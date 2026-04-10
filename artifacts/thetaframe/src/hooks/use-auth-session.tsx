import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export type AuthSessionStatus = "loading" | "ready" | "failed" | "signed_out";

type AuthSessionContextValue = {
  status: AuthSessionStatus;
  userId: string | null;
  errorMessage: string | null;
  isTokenReady: boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, getToken } = useAuth();
  const [status, setStatus] = useState<AuthSessionStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);
  const readyUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function verifyTokenReadiness() {
      if (!isLoaded) {
        setAuthTokenGetter(null);
        setStatus("loading");
        setErrorMessage(null);
        return;
      }

      if (!userId) {
        setAuthTokenGetter(null);
        setStatus("signed_out");
        setErrorMessage(null);
        readyUserIdRef.current = null;
        return;
      }

      setAuthTokenGetter(() => getTokenRef.current());

      const hasReadySessionForUser = readyUserIdRef.current === userId;
      if (!hasReadySessionForUser) {
        setStatus("loading");
      }
      setErrorMessage(null);

      let lastError: unknown = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const token = await getTokenRef.current();
          if (token) {
            if (!cancelled) {
              readyUserIdRef.current = userId;
              setStatus("ready");
              setErrorMessage(null);
            }
            return;
          }
        } catch (error) {
          lastError = error;
        }

        if (attempt < 2) {
          await sleep(250 * (attempt + 1));
        }
      }

      if (!cancelled) {
        readyUserIdRef.current = null;
        setStatus("failed");
        setErrorMessage(
          lastError instanceof Error
            ? lastError.message
            : "Your session token could not be prepared.",
        );
      }
    }

    void verifyTokenReadiness();

    return () => {
      cancelled = true;
      setAuthTokenGetter(null);
    };
  }, [isLoaded, userId]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      status,
      userId: userId ?? null,
      errorMessage,
      isTokenReady: status === "ready",
    }),
    [errorMessage, status, userId],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return context;
}
