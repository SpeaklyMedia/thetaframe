import { useState } from "react";
import { Layout } from "@/components/layout";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ChevronDown, Pencil } from "lucide-react";

type Phase = "COLD" | "WARM" | "HOT";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className="text-sm font-medium">Human Status</label>
          <Input
            value={form.humanStatus ?? ""}
            onChange={(e) => set("humanStatus", e.target.value || null)}
            placeholder="e.g. Intro call done, waiting..."
            data-testid="input-human-status"
          />
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

        <div className="space-y-1.5 md:col-span-1">
          <label className="text-sm font-medium">Next Action</label>
          <Input
            value={form.nextAction ?? ""}
            onChange={(e) => set("nextAction", e.target.value || null)}
            placeholder="What's the next concrete step?"
            data-testid="input-next-action"
          />
        </div>
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

function BrandCard({
  brand,
  onEdit,
  onDelete,
}: {
  brand: BizdevBrand;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="bg-card border rounded-2xl p-5 shadow-sm space-y-3 transition-shadow hover:shadow-md group"
      data-testid={`brand-card-${brand.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base font-semibold truncate">{brand.brand}</h3>
          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${PHASE_COLORS[brand.phase as Phase]}`}>
            {PHASE_LABELS[brand.phase as Phase]}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit" data-testid={`button-edit-brand-${brand.id}`}>
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete" data-testid={`button-delete-brand-${brand.id}`}>
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {brand.humanStatus && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs">Status: </span>
            <span>{brand.humanStatus}</span>
          </div>
        )}
        {brand.nextAction && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs">Next: </span>
            <span>{brand.nextAction}</span>
          </div>
        )}
        {brand.nextTouchDate && (
          <div>
            <span className="text-muted-foreground text-xs">Touch by: </span>
            <span className="font-medium">{brand.nextTouchDate}</span>
            {brand.nextTouchChannel && (
              <span className="text-muted-foreground text-xs"> via {brand.nextTouchChannel}</span>
            )}
          </div>
        )}
        {brand.owner && (
          <div>
            <span className="text-muted-foreground text-xs">Owner: </span>
            <span>{brand.owner}</span>
          </div>
        )}
        {brand.blocker && (
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs">Blocker: </span>
            <span className="text-destructive">{brand.blocker}</span>
          </div>
        )}
        {brand.moneyOpen != null && (
          <div>
            <span className="text-muted-foreground text-xs">Money Open: </span>
            <span className="font-medium">${brand.moneyOpen.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
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

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBizdevBrandsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBizdevSummaryQueryKey() });
  };

  const handleCreate = (data: BizdevBrandBody) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        setShowForm(false);
        invalidate();
      },
    });
  };

  const handleUpdate = (id: number, data: BizdevBrandBody) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => {
        setEditingId(null);
        invalidate();
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, { onSuccess: invalidate });
  };

  const editingBrand = brands?.find((b) => b.id === editingId);

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-bizdev-title">BizDev</h1>
            <p className="text-muted-foreground mt-1">Brand and client lead tracker</p>
          </div>
          {!showForm && editingId === null && (
            <Button onClick={() => setShowForm(true)} data-testid="button-new-lead">
              <Plus className="w-4 h-4 mr-2" /> New Lead
            </Button>
          )}
        </header>

        {summary && (
          <div className="grid grid-cols-3 gap-4" data-testid="bizdev-summary">
            {(["COLD", "WARM", "HOT"] as Phase[]).map((p) => (
              <div key={p} className={`rounded-2xl p-4 text-center border shadow-sm ${PHASE_COLORS[p]}`}>
                <div className="text-2xl font-bold">{summary.counts[p]}</div>
                <div className="text-xs font-semibold mt-0.5 uppercase tracking-wide opacity-80">{PHASE_LABELS[p]}</div>
              </div>
            ))}
          </div>
        )}

        {(showForm || editingId !== null) && (
          <div className="bg-card border rounded-2xl p-6 shadow-sm" data-testid="brand-form-panel">
            <h2 className="text-lg font-semibold mb-5">
              {editingId !== null ? "Edit Lead" : "New Lead"}
            </h2>
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
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              isSaving={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : brands && brands.length > 0 ? (
          <div className="space-y-4" data-testid="brands-list">
            {brands.map((brand) => (
              editingId === brand.id ? null : (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onEdit={() => {
                    setShowForm(false);
                    setEditingId(brand.id);
                  }}
                  onDelete={() => handleDelete(brand.id)}
                />
              )
            ))}
          </div>
        ) : !showForm ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">No leads yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)} data-testid="button-empty-new-lead">
              <Plus className="w-4 h-4 mr-2" /> Add your first lead
            </Button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
