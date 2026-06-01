import { useEffect, useRef, useState } from "react";
import { useSignIn, useUser } from "@clerk/react";
import { Layout } from "@/components/layout";

const QA_AUTH_CALLBACK_ENABLED = import.meta.env.VITE_LIFEOS_PREVIEW_AUTH_CALLBACK_ENABLED === "true";
const QA_AUTH_STATUS_KEY = "lifeos_qa_auth_callback_status";

function writeQaAuthStatus(stage: string, detail?: unknown) {
  const error = detail && typeof detail === "object" && "message" in detail
    ? String((detail as { message?: unknown }).message ?? "").slice(0, 180)
    : undefined;
  window.localStorage.setItem(
    QA_AUTH_STATUS_KEY,
    JSON.stringify({
      stage,
      error,
      updated_at: new Date().toISOString(),
    }),
  );
}

export default function QaAuthConsumeTicketPage() {
  const { fetchStatus, signIn } = useSignIn();
  const { isSignedIn } = useUser();
  const [status, setStatus] = useState<"loading" | "blocked" | "complete" | "failed">("loading");
  const attemptedTicketRef = useRef(false);

  useEffect(() => {
    if (!QA_AUTH_CALLBACK_ENABLED) {
      writeQaAuthStatus("blocked_flag_off");
      setStatus("blocked");
      return;
    }

    if (isSignedIn) {
      writeQaAuthStatus("already_signed_in");
      setStatus("complete");
      window.location.replace("/dashboard");
      return;
    }

    if (fetchStatus === "fetching" || !signIn) return;
    if (attemptedTicketRef.current) return;

    const ticket = new URLSearchParams(window.location.search).get("ticket");
    if (!ticket) {
      writeQaAuthStatus("missing_ticket");
      setStatus("failed");
      return;
    }
    const ticketToken = ticket;
    attemptedTicketRef.current = true;

    let cancelled = false;

    async function consumeTicket() {
      try {
        writeQaAuthStatus("ticket_start");
        const ticketAttempt = await signIn.ticket({
          ticket: ticketToken,
        });

        if (cancelled) return;

        if (ticketAttempt.error) {
          writeQaAuthStatus("ticket_error", ticketAttempt.error);
          setStatus("failed");
          return;
        }

        writeQaAuthStatus("finalize_start");
        const finalizeAttempt = await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            window.location.assign(decorateUrl("/dashboard"));
          },
        });
        if (cancelled) return;

        if (finalizeAttempt.error) {
          writeQaAuthStatus("finalize_error", finalizeAttempt.error);
          setStatus("failed");
          return;
        }

        if (!cancelled) {
          writeQaAuthStatus("complete");
          setStatus("complete");
        }
      } catch {
        writeQaAuthStatus("exception");
        if (!cancelled) setStatus("failed");
      }
    }

    void consumeTicket();

    return () => {
      cancelled = true;
    };
  }, [fetchStatus, isSignedIn, signIn]);

  return (
    <Layout>
      <div
        className="flex-1 flex items-center justify-center px-4 py-24 text-center"
        data-testid="qa-auth-consume-ticket"
        data-status={status}
      >
        <span className="text-sm text-muted-foreground">
          {status === "blocked" ? "Preview authentication unavailable." : "Preparing secure preview..."}
        </span>
      </div>
    </Layout>
  );
}
