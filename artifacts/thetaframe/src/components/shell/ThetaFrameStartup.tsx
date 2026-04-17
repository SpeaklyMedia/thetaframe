import { cn } from "@/lib/utils";

interface ThetaFrameStartupProps {
  className?: string;
}

export function ThetaFrameStartup({ className }: ThetaFrameStartupProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A1F36]",
        className,
      )}
      data-testid="thetaframe-startup"
      role="status"
      aria-label="ThetaFrame is loading"
    >
      <div className="startup-phi-mark">
        <img
          src="/brand/THETAFRAME_LOADING_SCREEN_PRIMARY__COSMIC_PHI__2026-04-13__R1.png"
          alt="ThetaFrame"
          className="h-64 w-64 object-contain sm:h-80 sm:w-80"
        />
      </div>
      <p className="startup-wordmark mt-6 text-sm font-medium uppercase tracking-widest text-[#D0C0B0]/60">
        ThetaFrame
      </p>

      <style>{`
        .startup-phi-mark {
          animation: tf-breath 2.4s ease-in-out infinite alternate;
        }
        .startup-wordmark {
          animation: tf-breath 2.4s ease-in-out 0.4s infinite alternate;
        }
        @keyframes tf-breath {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .startup-phi-mark,
          .startup-wordmark {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
