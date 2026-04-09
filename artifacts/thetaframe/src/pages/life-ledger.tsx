import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListLifeLedgerEntries,
  useCreateLifeLedgerEntry,
  useUpdateLifeLedgerEntry,
  useDeleteLifeLedgerEntry,
  useGetNext90Days,
  useGetSubscriptionAudit,
  getListLifeLedgerEntriesQueryKey,
  getGetNext90DaysQueryKey,
  getGetSubscriptionAuditQueryKey,
  LifeLedgerEntry,
  LifeLedgerEntryBody,
  LifeLedgerEntryBodyImpactLevel,
  LifeLedgerEntryBodyReviewWindow,
  LifeLedgerEntryBodyBillingCycle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ChevronDown, Pencil, Calendar, TrendingUp } from "lucide-react";

type Tab = "people" | "events" | "financial" | "subscriptions" | "travel";

const TABS: { key: Tab; label: string }[] = [
  { key: "people", label: "People" },
  { key: "events", label: "Events" },
  { key: "financial", label: "Financial" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "travel", label: "Travel" },
];

const IMPACT_LEVELS = ["low", "medium", "high"];
const REVIEW_WINDOWS = ["annual", "quarterly", "monthly", "situational"];
const BILLING_CYCLES = ["monthly", "annual"];

const EMPTY_FORM: LifeLedgerEntryBody = {
  name: "",
  tags: [],
  impactLevel: null,
  reviewWindow: null,
  dueDate: null,
  notes: null,
  amount: null,
  currency: null,
  isEssential: null,
  billingCycle: null,
};

function EntryForm({
  tab,
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  tab: Tab;
  initial: LifeLedgerEntryBody;
  onSave: (data: LifeLedgerEntryBody) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<LifeLedgerEntryBody>(initial);
  const [tagInput, setTagInput] = useState("");

  const set = <K extends keyof LifeLedgerEntryBody>(k: K, v: LifeLedgerEntryBody[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => set("tags", form.tags.filter((t) => t !== tag));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const showFinancial = tab === "financial" || tab === "subscriptions";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name *</label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Entry name"
            required
            data-testid="input-entry-name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => set("dueDate", e.target.value || null)}
            data-testid="input-due-date"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Impact Level</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-impact-level">
                <span className="capitalize">{form.impactLevel ?? "None"}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => set("impactLevel", null)}>None</DropdownMenuItem>
              {IMPACT_LEVELS.map((l) => (
                <DropdownMenuItem key={l} onClick={() => set("impactLevel", l as LifeLedgerEntryBodyImpactLevel)} className="capitalize" data-testid={`impact-option-${l}`}>
                  {l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Review Window</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" data-testid="select-review-window">
                <span className="capitalize">{form.reviewWindow ?? "None"}</span>
                <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => set("reviewWindow", null)}>None</DropdownMenuItem>
              {REVIEW_WINDOWS.map((r) => (
                <DropdownMenuItem key={r} onClick={() => set("reviewWindow", r as LifeLedgerEntryBodyReviewWindow)} className="capitalize" data-testid={`review-option-${r}`}>
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showFinancial && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.amount ?? ""}
                onChange={(e) => set("amount", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                data-testid="input-amount"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Currency</label>
              <Input
                value={form.currency ?? ""}
                onChange={(e) => set("currency", e.target.value || null)}
                placeholder="USD"
                maxLength={3}
                data-testid="input-currency"
              />
            </div>
          </>
        )}

        {tab === "subscriptions" && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Billing Cycle</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" data-testid="select-billing-cycle">
                    <span className="capitalize">{form.billingCycle ?? "None"}</span>
                    <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => set("billingCycle", null)}>None</DropdownMenuItem>
                  {BILLING_CYCLES.map((b) => (
                    <DropdownMenuItem key={b} onClick={() => set("billingCycle", b as LifeLedgerEntryBodyBillingCycle)} className="capitalize" data-testid={`billing-option-${b}`}>
                      {b}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Checkbox
                id="is-essential"
                checked={form.isEssential ?? false}
                onCheckedChange={(c) => set("isEssential", c === true ? true : false)}
                data-testid="checkbox-is-essential"
              />
              <label htmlFor="is-essential" className="text-sm font-medium cursor-pointer">
                Essential subscription
              </label>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tags</label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag..."
            data-testid="input-tag"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag} data-testid="button-add-tag">
            Add
          </Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {form.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground" data-testid={`button-remove-tag-${tag}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || null)}
          placeholder="Any notes..."
          className="resize-none h-20"
          data-testid="textarea-notes"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSaving || !form.name.trim()} data-testid="button-save-entry">
          {isSaving ? "Saving..." : "Save Entry"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-entry">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: LifeLedgerEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="bg-card border rounded-xl p-4 shadow-sm group transition-shadow hover:shadow-md"
      data-testid={`entry-card-${entry.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{entry.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(entry.tags as string[]).map((tag) => (
              <span key={tag} className="bg-secondary text-xs px-1.5 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit" data-testid={`button-edit-entry-${entry.id}`}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete" data-testid={`button-delete-entry-${entry.id}`}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
        {entry.dueDate && (
          <span>Due {entry.dueDate}</span>
        )}
        {entry.impactLevel && (
          <span className="capitalize">Impact: {entry.impactLevel}</span>
        )}
        {entry.amount != null && (
          <span>${entry.amount.toLocaleString()} {entry.currency ?? ""}</span>
        )}
        {entry.billingCycle && (
          <span className="capitalize">{entry.billingCycle}</span>
        )}
        {entry.isEssential != null && (
          <span>{entry.isEssential ? "Essential" : "Non-essential"}</span>
        )}
      </div>

      {entry.notes && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
      )}
    </div>
  );
}

function Next90DaysPanel() {
  const { data } = useGetNext90Days({ query: { queryKey: getGetNext90DaysQueryKey(), refetchOnWindowFocus: false } });

  if (!data || data.entries.length === 0) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3" data-testid="next-90-days-panel">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Next 90 Days</h2>
        <span className="text-xs text-muted-foreground ml-auto">through {data.windowEnd}</span>
      </div>
      <div className="space-y-2">
        {data.entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 text-sm" data-testid={`next-90-item-${e.id}`}>
            <span className="font-medium font-mono text-xs w-24 shrink-0">{e.dueDate}</span>
            <span className="capitalize text-xs text-muted-foreground w-20 shrink-0">{e.tab}</span>
            <span className="truncate">{e.name}</span>
            {e.impactLevel && (
              <span className="text-xs capitalize text-muted-foreground shrink-0">{e.impactLevel}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionAuditPanel() {
  const { data } = useGetSubscriptionAudit({ query: { queryKey: getGetSubscriptionAuditQueryKey(), refetchOnWindowFocus: false } });

  if (!data || data.items.length === 0) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4" data-testid="subscription-audit-panel">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Subscription Audit</h2>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-muted rounded-xl p-3">
          <div className="text-lg font-bold">${data.totalMonthlyEssential.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Essential/mo</div>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="text-lg font-bold">${data.totalMonthlyNonEssential.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Non-essential/mo</div>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="text-lg font-bold">${data.totalMonthly.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total/mo</div>
        </div>
      </div>
      <div className="space-y-1">
        {data.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0" data-testid={`audit-item-${item.id}`}>
            <span>{item.name}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.isEssential != null && (
                <span>{item.isEssential ? "Essential" : "Optional"}</span>
              )}
              {item.monthlyEquivalent != null && (
                <span className="font-mono">${item.monthlyEquivalent.toFixed(2)}/mo</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LifeLedgerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: entries, isLoading } = useListLifeLedgerEntries(activeTab, {
    query: {
      queryKey: getListLifeLedgerEntriesQueryKey(activeTab),
    },
  });

  const createMutation = useCreateLifeLedgerEntry();
  const updateMutation = useUpdateLifeLedgerEntry();
  const deleteMutation = useDeleteLifeLedgerEntry();

  const invalidateTab = (tab: Tab) =>
    queryClient.invalidateQueries({ queryKey: getListLifeLedgerEntriesQueryKey(tab) });

  const handleCreate = (data: LifeLedgerEntryBody) => {
    createMutation.mutate({ tab: activeTab, data }, {
      onSuccess: () => {
        setShowForm(false);
        invalidateTab(activeTab);
      },
    });
  };

  const handleUpdate = (id: number, data: LifeLedgerEntryBody) => {
    updateMutation.mutate({ tab: activeTab, id, data }, {
      onSuccess: () => {
        setEditingId(null);
        invalidateTab(activeTab);
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ tab: activeTab, id }, { onSuccess: () => invalidateTab(activeTab) });
  };

  const editingEntry = entries?.find((e) => e.id === editingId);

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-life-ledger-title">Life Ledger</h1>
            <p className="text-muted-foreground mt-1">Personal obligations tracker</p>
          </div>
          {!showForm && editingId === null && (
            <Button onClick={() => setShowForm(true)} data-testid="button-new-entry">
              <Plus className="w-4 h-4 mr-2" /> New Entry
            </Button>
          )}
        </header>

        <Next90DaysPanel />

        {activeTab === "subscriptions" && <SubscriptionAuditPanel />}

        <div className="flex gap-1 border-b" data-testid="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setShowForm(false);
                setEditingId(null);
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(showForm || editingId !== null) && (
          <div className="bg-card border rounded-2xl p-6 shadow-sm" data-testid="entry-form-panel">
            <h2 className="text-lg font-semibold mb-5">
              {editingId !== null ? "Edit Entry" : "New Entry"}
            </h2>
            <EntryForm
              tab={activeTab}
              initial={
                editingEntry
                  ? {
                      name: editingEntry.name,
                      tags: (editingEntry.tags as string[]) ?? [],
                      impactLevel: editingEntry.impactLevel ?? null,
                      reviewWindow: editingEntry.reviewWindow ?? null,
                      dueDate: editingEntry.dueDate ?? null,
                      notes: editingEntry.notes ?? null,
                      amount: editingEntry.amount ?? null,
                      currency: editingEntry.currency ?? null,
                      isEssential: editingEntry.isEssential ?? null,
                      billingCycle: editingEntry.billingCycle ?? null,
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
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2" data-testid="entries-list">
            {entries.map((entry) =>
              editingId === entry.id ? null : (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => {
                    setShowForm(false);
                    setEditingId(entry.id);
                  }}
                  onDelete={() => handleDelete(entry.id)}
                />
              )
            )}
          </div>
        ) : !showForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No entries in {activeTab} yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)} data-testid="button-empty-new-entry">
              <Plus className="w-4 h-4 mr-2" /> Add first entry
            </Button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
