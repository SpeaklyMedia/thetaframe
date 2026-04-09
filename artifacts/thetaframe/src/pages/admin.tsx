import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useListAdminUsers,
  usePutAdminUserPermissions,
  useGetAdminUserPermissions,
  useListAdminPresets,
  useCreateAdminPreset,
  useApplyAdminPreset,
  useDeleteAdminPreset,
  getListAdminUsersQueryKey,
  getGetAdminUserPermissionsQueryKey,
  getListAdminPresetsQueryKey,
  AdminUser,
  PermissionEntry,
  AccessPreset,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Plus, Trash2, Check } from "lucide-react";

const MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"] as const;
const MODULE_LABELS: Record<string, string> = {
  daily: "Daily Frame",
  weekly: "Weekly Rhythm",
  vision: "Vision Tracker",
  bizdev: "BizDev",
  "life-ledger": "Life Ledger",
  reach: "REACH",
};
const ENVIRONMENTS = ["development", "staging", "production"] as const;
type Environment = typeof ENVIRONMENTS[number];

function PermissionBadges({ permissions }: { permissions: PermissionEntry[] }) {
  const byModule: Record<string, string[]> = {};
  for (const p of permissions) {
    if (!byModule[p.module]) byModule[p.module] = [];
    byModule[p.module].push(p.environment);
  }
  if (Object.keys(byModule).length === 0) {
    return <span className="text-xs text-muted-foreground">No access</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(byModule).map(([mod, envs]) => (
        <span key={mod} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs font-medium" data-testid={`badge-${mod}`}>
          {MODULE_LABELS[mod] ?? mod}
          <span className="text-muted-foreground">({envs.map(e => e[0]).join("")})</span>
        </span>
      ))}
    </div>
  );
}

function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return "never";
  const ms = Date.now() - ts;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function UserListItem({ user, onClick, isSelected }: { user: AdminUser; onClick: () => void; isSelected: boolean }) {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors ${isSelected ? "bg-muted" : ""}`}
      data-testid={`user-row-${user.id}`}
    >
      <div className="flex items-center gap-3">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{displayName}</span>
            {user.role === "admin" && (
              <span className="px-1.5 py-0 rounded text-xs bg-primary/10 text-primary font-medium shrink-0">admin</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto shrink-0" data-testid={`last-active-${user.id}`}>
              {formatRelativeTime(user.lastActiveAt)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          <div className="mt-1">
            <PermissionBadges permissions={user.permissions} />
          </div>
        </div>
      </div>
    </button>
  );
}

type PermGrid = Record<string, Record<string, boolean>>;

function buildGrid(permissions: PermissionEntry[]): PermGrid {
  const grid: PermGrid = {};
  for (const mod of MODULES) {
    grid[mod] = {};
    for (const env of ENVIRONMENTS) {
      grid[mod][env] = false;
    }
  }
  for (const p of permissions) {
    if (grid[p.module]) {
      grid[p.module][p.environment] = true;
    }
  }
  return grid;
}

function gridToPermissions(grid: PermGrid): PermissionEntry[] {
  const perms: PermissionEntry[] = [];
  for (const mod of Object.keys(grid)) {
    for (const env of Object.keys(grid[mod])) {
      if (grid[mod][env]) {
        perms.push({ module: mod, environment: env });
      }
    }
  }
  return perms;
}

function PermissionEditor({
  user,
  presets,
  onBack,
}: {
  user: AdminUser;
  presets: AccessPreset[];
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  const { data: permsData } = useGetAdminUserPermissions(user.id, {
    query: { queryKey: getGetAdminUserPermissionsQueryKey(user.id) },
  });

  const [grid, setGrid] = useState<PermGrid>(() =>
    buildGrid(permsData?.permissions ?? user.permissions),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const putPermissions = usePutAdminUserPermissions();
  const applyPreset = useApplyAdminPreset();
  const createPreset = useCreateAdminPreset();
  const deletePreset = useDeleteAdminPreset();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminUserPermissionsQueryKey(user.id) });
  };

  const toggle = (mod: string, env: string) => {
    setGrid((g) => ({
      ...g,
      [mod]: { ...g[mod], [env]: !g[mod][env] },
    }));
    setIsDirty(true);
  };

  const toggleRow = (mod: string) => {
    const allOn = ENVIRONMENTS.every((e) => grid[mod][e]);
    setGrid((g) => ({
      ...g,
      [mod]: Object.fromEntries(ENVIRONMENTS.map((e) => [e, !allOn])),
    }));
    setIsDirty(true);
  };

  const toggleCol = (env: string) => {
    const allOn = MODULES.every((m) => grid[m][env]);
    setGrid((g) => {
      const next = { ...g };
      for (const m of MODULES) {
        next[m] = { ...next[m], [env]: !allOn };
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    putPermissions.mutate(
      { userId: user.id, data: { permissions: gridToPermissions(grid) } },
      {
        onSuccess: () => {
          setIsDirty(false);
          invalidate();
        },
      },
    );
  };

  const handleApplyPreset = (presetId: number) => {
    applyPreset.mutate(
      { id: presetId, userId: user.id },
      {
        onSuccess: (data) => {
          setGrid(buildGrid(data.permissions));
          setIsDirty(false);
          invalidate();
        },
      },
    );
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    setIsSavingPreset(true);
    createPreset.mutate(
      { data: { name: presetName.trim(), permissions: gridToPermissions(grid) } },
      {
        onSuccess: () => {
          setPresetName("");
          setIsSavingPreset(false);
          queryClient.invalidateQueries({ queryKey: getListAdminPresetsQueryKey() });
        },
        onError: () => setIsSavingPreset(false),
      },
    );
  };

  const handleDeletePreset = (id: number) => {
    deletePreset.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminPresetsQueryKey() });
      },
    });
  };

  return (
    <div className="flex flex-col gap-6" data-testid="permission-editor">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5" data-testid="button-back">
          <ChevronLeft className="w-4 h-4" />
          Users
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Module Access</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Toggle modules per environment</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="permission-grid">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-36">Module</th>
                    {ENVIRONMENTS.map((env) => (
                      <th key={env} className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                        <button onClick={() => toggleCol(env)} className="hover:text-foreground transition-colors capitalize" data-testid={`toggle-col-${env}`}>
                          {env}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod) => (
                    <tr key={mod} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRow(mod)} className="text-sm font-medium hover:text-muted-foreground transition-colors text-left" data-testid={`toggle-row-${mod}`}>
                          {MODULE_LABELS[mod]}
                        </button>
                      </td>
                      {ENVIRONMENTS.map((env) => (
                        <td key={env} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(mod, env)}
                            className={`w-9 h-5 rounded-full transition-colors relative ${grid[mod]?.[env] ? "bg-primary" : "bg-muted"}`}
                            aria-label={`${grid[mod]?.[env] ? "Revoke" : "Grant"} ${MODULE_LABELS[mod]} in ${env}`}
                            data-testid={`toggle-${mod}-${env}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${grid[mod]?.[env] ? "translate-x-4" : "translate-x-0.5"}`}
                            />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Click a module or environment header to toggle all</p>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || putPermissions.isPending}
                data-testid="button-save-permissions"
              >
                {putPermissions.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border rounded-2xl shadow-sm">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Apply Preset</h3>
            </div>
            <div className="p-2">
              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">No presets yet</p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40" data-testid={`preset-item-${preset.id}`}>
                    <button
                      className="flex-1 text-left text-sm"
                      onClick={() => handleApplyPreset(preset.id)}
                      data-testid={`button-apply-preset-${preset.id}`}
                    >
                      {preset.name}
                      <span className="text-xs text-muted-foreground ml-1.5">({preset.permissions.length} grants)</span>
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Delete preset ${preset.name}`}
                      data-testid={`button-delete-preset-${preset.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border rounded-2xl shadow-sm">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Save as Preset</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Save current grid as a named preset</p>
            </div>
            <div className="p-4 space-y-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="h-8 text-sm"
                data-testid="input-preset-name"
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={handleSavePreset}
                disabled={!presetName.trim() || isSavingPreset}
                data-testid="button-save-preset"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSavingPreset ? "Saving..." : "Save Preset"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: users, isLoading: usersLoading } = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey() },
  });
  const { data: presets } = useListAdminPresets({
    query: { queryKey: getListAdminPresetsQueryKey() },
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-admin-title">Admin</h1>
          <p className="text-muted-foreground mt-1">Manage users and module access permissions</p>
        </header>

        {selectedUser ? (
          <PermissionEditor
            user={selectedUser}
            presets={presets ?? []}
            onBack={() => setSelectedUserId(null)}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="max-w-sm"
                data-testid="input-user-search"
              />
              <span className="text-sm text-muted-foreground" data-testid="text-user-count">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm" data-testid="users-list">
              {usersLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {search ? "No users match that search." : "No users found."}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    onClick={() => setSelectedUserId(user.id)}
                    isSelected={selectedUserId === user.id}
                  />
                ))
              )}
            </div>

            {(presets ?? []).length > 0 && (
              <div className="bg-card border rounded-2xl shadow-sm">
                <div className="px-4 py-3 border-b">
                  <h2 className="text-sm font-semibold">Access Presets</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Named permission groups — select a user to apply them</p>
                </div>
                <div className="divide-y">
                  {(presets ?? []).map((preset) => (
                    <div key={preset.id} className="px-4 py-3 flex items-start justify-between gap-3" data-testid={`preset-overview-${preset.id}`}>
                      <div>
                        <div className="text-sm font-medium">{preset.name}</div>
                        <div className="mt-1">
                          <PermissionBadges permissions={preset.permissions} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">by {preset.createdBy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
