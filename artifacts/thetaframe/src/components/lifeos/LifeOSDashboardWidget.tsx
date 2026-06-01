import { useUser } from "@clerk/react";
import { AlertTriangle, FileCheck2, ShieldCheck } from "lucide-react";

const LIFEOS_WIDGET_ENABLED = import.meta.env.VITE_LIFEOS_DASHBOARD_WIDGET_ENABLED === "true";

const MARK_USER_IDS = new Set(
  (import.meta.env.VITE_LIFEOS_MARK_USER_IDS ?? "")
    .split(",")
    .map((id: string) => id.trim())
    .filter(Boolean),
);

const lifeosFixtureV0 = {
  executiveState: {
    operatingState: "review",
    proofState: "partial",
    authorityState: "implementation_blocked",
    nextSafeActionId: "review_truth_contract_fixture_v0",
    blockedActionIds: [
      "thetaframe_edit",
      "modal_nodal_edit",
      "automation_activation",
      "client_visible_send",
      "raw_source_expansion",
      "memory_skill_lane_wizard_auth_kb_update",
    ],
  },
  receipts: [
    "LIFEOS_TRUTH_CONTRACT_FIXTURE_V0_BUILT__20260531T011500Z.md",
    "KARK_QA_LIFEOS_TRUTH_CONTRACT_FIXTURE_V0__20260531T011500Z.md",
  ],
};

const actionLabels: Record<string, string> = {
  thetaframe_edit: "ThetaFrame edits",
  modal_nodal_edit: "Modal-Nodal edits",
  automation_activation: "Automation activation",
  client_visible_send: "Client-visible sends",
  raw_source_expansion: "Raw-source expansion",
  memory_skill_lane_wizard_auth_kb_update: "AI KB and auth updates",
  review_truth_contract_fixture_v0: "Review the local truth-contract fixture",
};

const receiptLabels: Record<string, string> = {
  LIFEOS_TRUTH_CONTRACT_FIXTURE_V0_BUILT__20260531T011500Z:
    "Truth-contract fixture built",
  KARK_QA_LIFEOS_TRUTH_CONTRACT_FIXTURE_V0__20260531T011500Z:
    "Kark QA approved fixture",
};

function formatStateLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripReceiptExtension(receipt: string): string {
  return receipt.replace(/\.md$/, "");
}

function formatActionLabel(value: string): string {
  return actionLabels[value] ?? formatStateLabel(value);
}

function formatReceiptLabel(receipt: string): string {
  return receiptLabels[stripReceiptExtension(receipt)] ?? stripReceiptExtension(receipt);
}

export function LifeOSDashboardWidget() {
  const { user, isLoaded } = useUser();
  const isAllowedUser = isLoaded && user?.id ? MARK_USER_IDS.has(user.id) : false;

  if (!LIFEOS_WIDGET_ENABLED || !isAllowedUser) {
    return null;
  }

  const { executiveState, receipts } = lifeosFixtureV0;
  const blockedCount = executiveState.blockedActionIds.length;

  return (
    <section
      className="rounded-lg border border-slate-300 bg-white px-4 py-3 shadow-sm sm:px-5"
      data-testid="lifeos-dashboard-widget"
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-slate-950">Automation checkpoint</p>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase leading-5 text-amber-900">
                Manual review only
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
              Nothing client-visible, production, or self-running is active from this dashboard. Review the proof packet before expanding automation permissions.
            </p>
          </div>
        </div>

        <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:grid-cols-3" data-testid="lifeos-state-row">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase leading-4 text-slate-500">Mode</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              Review only
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase leading-4 text-slate-500">Proof</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {receipts.length} receipts
            </p>
          </div>
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase leading-4 text-rose-600">Locked</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-rose-900">
              {blockedCount} actions
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-start gap-2 text-slate-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="min-w-0 leading-5">
            Next: {formatActionLabel(executiveState.nextSafeActionId)}.
          </p>
        </div>
        <div className="flex min-w-0 items-start gap-2 text-slate-700">
          <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
          <p className="min-w-0 leading-5">
            Proof pointer: {formatReceiptLabel(receipts[0])}.
          </p>
        </div>
      </div>
    </section>
  );
}
