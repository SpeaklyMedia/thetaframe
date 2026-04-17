import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { LaneHero } from "@/components/shell/LaneHero";
import { SupportRail } from "@/components/shell/SupportRail";
import {
  useListBizdevBrands,
  useGetBizdevSummary,
  useCreateBizdevBrand,
  useUpdateBizdevBrand,
  useDeleteBizdevBrand,
  getListBizdevBrandsQueryKey,
  getGetBizdevSummaryQueryKey,
  BizdevBrand,
  BizdevBrandBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ChevronDown, Pencil, ChevronUp, ChevronsUpDown } from "lucide-react";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { SurfaceOnboardingCard } from "@/components/surface-onboarding-card";

type Phase = "COLD" | "WARM" | "HOT";
type SortField = "brand" | "nextTouchDate" | "phase" | "moneyOpen";
type SortDir = "asc" | "desc";

const PHASE_LABELS: Record<Phase, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
};

const PHASE_COLORS: Record<Phase, string> = {
  COLD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  WARM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HOT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const CHANNELS = ["Email", "Call", "LinkedIn", "Meeting", "DM", "Other"];

const EMPTY_FORM: BizdevBrandBody = {
  brand: "",
  phase: "COLD",
  humanStatus: null,
  nextAction: null,
  nextTouchDate: null,
  nextTouchChannel: null,
  owner: null,
  blocker: null,
  moneyOpen: null,
  moneyNotes: null,
};

function BrandForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: BizdevBrandBody;
  onSave: (data: BizdevBrandBody) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<BizdevBrandBody>(initial);

  const set = <K extends keyof BizdevBrandBody>(k: K, v: BizdevBrandBody[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Brand *</label>
          <Input
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="Brand or client name"
            required
            data-testid="input-brand-name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phase</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-phase">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PHASE_COLORS[form.phase as Phase]}`}>
                  {PHASE_LABELS[form.phase as Phase]}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              {(["COLD", "WARM", "HOT"] as Phase[]).map((p) => (
                <DropdownMenuItem key={p} onClick={() => set("phase", p)} data-testid={`phase-option-${p.toLowerCase()}`}>
                  <span className={`mr-2 px-2 py-0.5 rounded text-xs font-semibold ${PHASE_COLORS[p]}`}>{PHASE_LABELS[p]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Owner</label>
          <Input
            value={form.owner ?? ""}
            onChange={(e) => set("owner", e.target.value || null)}
            placeholder="Who owns this lead?"
            data-testid="input-owner"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Human Status</label>
          <Input
            value={form.humanStatus ?? ""}
            onChange={(e) => set("humanStatus", e.target.value || null)}
            placeholder="e.g. Intro call done, waiting..."
            data-testid="input-human-status"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Next Action</label>
          <Input
            value={form.nextAction ?? ""}
            onChange={(e) => set("nextAction", e.target.value || null)}
            placeholder="What's the next concrete step?"
            data-testid="input-next-action"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Blocker</label>
          <Input
            value={form.blocker ?? ""}
            onChange={(e) => set("blocker", e.target.value || null)}
            placeholder="What's in the way?"
            data-testid="input-blocker"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Next Touch Date</label>
          <Input
            type="date"
            value={form.nextTouchDate ?? ""}
            onChange={(e) => set("nextTouchDate", e.target.value || null)}
            data-testid="input-next-touch-date"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Next Touch Channel</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-next-touch-channel">
                <span className="text-sm">{form.nextTouchChannel || "Select channel..."}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => set("nextTouchChannel", null)}>
                <span className="text-muted-foreground">None</span>
              </DropdownMenuItem>
              {CHANNELS.map((c) => (
                <DropdownMenuItem key={c} onClick={() => set("nextTouchChannel", c)} data-testid={`channel-option-${c.toLowerCase()}`}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Money Open (USD)</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={form.moneyOpen ?? ""}
            onChange={(e) => set("moneyOpen", e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="0.00"
            data-testid="input-money-open"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Money Notes</label>
        <Textarea
          value={form.moneyNotes ?? ""}
          onChange={(e) => set("moneyNotes", e.target.value || null)}
          placeholder="Rate card, retainer details, custom deals..."
          className="resize-none h-20"
          data-testid="textarea-money-notes"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSaving || !form.brand.trim()} data-testid="button-save-brand">
          {isSaving ? "Saving..." : "Save Lead"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-brand">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 ml-1 text-muted-foreground/50" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
}

export default function BizdevPage() {
  const queryClient = useQueryClient();
  const { data: brands, isLoading } = useListBizdevBrands({
    query: { queryKey: getListBizdevBrandsQueryKey() },
  });
  const { data: summary } = useGetBizdevSummary({
    query: { queryKey: getGetBizdevSummaryQueryKey() },
  });
  const createMutation = useCreateBizdevBrand();
  const updateMutation = useUpdateBizdevBrand();
  const deleteMutation = useDeleteBizdevBrand();
  const { isSurfaceComplete } = useOnboardingProgress();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterPhase, setFilterPhase] = useState<Phase | "ALL">("ALL");
  const [filterOwner, setFilterOwner] = useState("");
  const [sortField, setSortField] = useState<SortField>("nextTouchDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const uniqueOwners = useMemo(
    () => Array.from(new Set(brands?.map((b) => b.owner).filter(Boolean) as string[])).sort(),
    [brands],
  );

  const filteredBrands = useMemo(() => {
    let list = brands ?? [];
    if (filterPhase !== "ALL") list = list.filter((b) => b.phase === filterPhase);
    if (filterOwner) list = list.filter((b) => b.owner === filterOwner);
    list = [...list].sort((a, b) => {
      let va: string | number | null = null;
      let vb: string | number | null = null;
      if (sortField === "brand") { va = a.brand; vb = b.brand; }
      else if (sortField === "nextTouchDate") { va = a.nextTouchDate ?? ""; vb = b.nextTouchDate ?? ""; }
      else if (sortField === "phase") { va = a.phase; vb = b.phase; }
      else if (sortField === "moneyOpen") { va = a.moneyOpen ?? -1; vb = b.moneyOpen ?? -1; }

      if (va === vb) return 0;
      const cmp = (va ?? "") < (vb ?? "") ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [brands, filterPhase, filterOwner, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBizdevBrandsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBizdevSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleCreate = (data: BizdevBrandBody) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        closeModal();
        invalidate();
      },
    });
  };

  const handleUpdate = (id: number, data: BizdevBrandBody) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        closeModal();
        invalidate();
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, { onSuccess: invalidate });
  };

  const editingBrand = brands?.find((b) => b.id === editingId);

  const ColHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} active={sortField === field} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <LaneHero
            label="BizDev"
            title="Brand and client lead tracker"
            subtitle="Track pipeline motion, next actions, blockers, and open money across your current opportunities."
            headingTestId="text-bizdev-title"
          />
          <Button onClick={() => { setEditingId(null); setModalOpen(true); }} data-testid="button-new-lead">
            <Plus className="w-4 h-4 mr-2" /> New Lead
          </Button>
        </div>

        <SupportRail direction="row">
          <span className="text-xs text-muted-foreground">Pipeline · Next Touch · Blockers · Money Open</span>
        </SupportRail>

        {!isSurfaceComplete("bizdev") && <SurfaceOnboardingCard surface="bizdev" />}

        {summary && (
          <div className="grid grid-cols-3 gap-4" data-testid="bizdev-summary">
            {(["COLD", "WARM", "HOT"] as Phase[]).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPhase(filterPhase === p ? "ALL" : p)}
                className={`rounded-2xl p-4 text-center border shadow-sm transition-all ${
                  filterPhase === p
                    ? PHASE_COLORS[p] + " ring-2 ring-current ring-offset-2"
                    : PHASE_COLORS[p]
                }`}
                data-testid={`filter-phase-${p.toLowerCase()}`}
              >
                <div className="text-2xl font-bold">{summary.counts[p]}</div>
                <div className="text-xs font-semibold mt-0.5 uppercase tracking-wide opacity-80">{PHASE_LABELS[p]}</div>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
          {filterPhase !== "ALL" && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${PHASE_COLORS[filterPhase]}`}>
              Phase: {PHASE_LABELS[filterPhase]}
              <button onClick={() => setFilterPhase("ALL")} aria-label="Clear phase filter" data-testid="clear-phase-filter">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {uniqueOwners.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="filter-owner-trigger">
                  {filterOwner ? `Owner: ${filterOwner}` : "Filter by owner"}
                  <ChevronDown className="w-3 h-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterOwner("")} data-testid="filter-owner-all">All owners</DropdownMenuItem>
                {uniqueOwners.map((o) => (
                  <DropdownMenuItem key={o} onClick={() => setFilterOwner(o)} data-testid={`filter-owner-${o}`}>
                    {o}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {filterOwner && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setFilterOwner("")}
              data-testid="clear-owner-filter"
            >
              Clear owner
            </button>
          )}
        </div>

        <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="brand-form-modal">
            <DialogHeader>
              <DialogTitle>{editingId !== null ? "Edit Lead" : "New Lead"}</DialogTitle>
            </DialogHeader>
            <BrandForm
              initial={
                editingBrand
                  ? {
                      brand: editingBrand.brand,
                      phase: editingBrand.phase as Phase,
                      humanStatus: editingBrand.humanStatus ?? null,
                      nextAction: editingBrand.nextAction ?? null,
                      nextTouchDate: editingBrand.nextTouchDate ?? null,
                      nextTouchChannel: editingBrand.nextTouchChannel ?? null,
                      owner: editingBrand.owner ?? null,
                      blocker: editingBrand.blocker ?? null,
                      moneyOpen: editingBrand.moneyOpen ?? null,
                      moneyNotes: editingBrand.moneyNotes ?? null,
                    }
                  : EMPTY_FORM
              }
              onSave={(data) => {
                if (editingId !== null) handleUpdate(editingId, data);
                else handleCreate(data);
              }}
              onCancel={closeModal}
              isSaving={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredBrands.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border shadow-sm bg-card" data-testid="brands-table">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <ColHeader field="brand" label="Brand" />
                  <ColHeader field="phase" label="Phase" />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Next Action</th>
                  <ColHeader field="nextTouchDate" label="Touch Date" />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channel</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Owner</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Blocker</th>
                  <ColHeader field="moneyOpen" label="$ Open" />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Money Notes</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`brand-row-${brand.id}`}>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{brand.brand}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PHASE_COLORS[brand.phase as Phase]}`}>
                        {PHASE_LABELS[brand.phase as Phase]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate">{brand.humanStatus ?? ""}</td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[180px] truncate">{brand.nextAction ?? ""}</td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{brand.nextTouchDate ?? ""}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{brand.nextTouchChannel ?? ""}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{brand.owner ?? ""}</td>
                    <td className="px-3 py-3 text-destructive max-w-[140px] truncate">{brand.blocker ?? ""}</td>
                    <td className="px-3 py-3 font-mono whitespace-nowrap">
                      {brand.moneyOpen != null ? `$${brand.moneyOpen.toLocaleString()}` : ""}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate" title={brand.moneyNotes ?? ""}>{brand.moneyNotes ?? ""}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingId(brand.id); setModalOpen(true); }}
                          aria-label="Edit"
                          data-testid={`button-edit-brand-${brand.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(brand.id)}
                          aria-label="Delete"
                          data-testid={`button-delete-brand-${brand.id}`}
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              {filterPhase !== "ALL" || filterOwner
                ? "No leads match the current filters."
                : "No leads yet."}
            </p>
            {filterPhase === "ALL" && !filterOwner && (
              <Button variant="outline" className="mt-4" onClick={() => { setEditingId(null); setModalOpen(true); }} data-testid="button-empty-new-lead">
                <Plus className="w-4 h-4 mr-2" /> Add your first lead
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
