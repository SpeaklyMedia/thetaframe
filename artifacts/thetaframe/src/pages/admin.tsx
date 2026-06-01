import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AccessPreset,
  AdminUser,
  ApiError,
  PermissionEntry,
  getGetAdminUserPermissionsQueryKey,
  getListAdminPresetsQueryKey,
  getListAdminUsersQueryKey,
  useApplyAdminPreset,
  useCreateAdminPreset,
  useDeleteAdminPreset,
  useGetAdminUserPermissions,
  useListAdminPresets,
  useListAdminUsers,
  usePutAdminUserPermissions,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { SurfaceOnboardingCard } from "@/components/surface-onboarding-card";
import { LaneHero } from "@/components/shell/LaneHero";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";

const BASIC_MODULES = ["daily", "weekly", "vision"] as const;
const MODULES = ["daily", "weekly", "vision", "bizdev", "life-ledger", "reach"] as const;
const MODULE_LABELS: Record<string, string> = {
  daily: "Daily Frame",
  weekly: "Weekly Rhythm",
  vision: "Vision Tracker",
  bizdev: "FollowUps",
  "life-ledger": "Life Ledger",
  reach: "REACH",
};
const ENVIRONMENTS = ["development", "staging", "production"] as const;
const STANDARD_PRESET_NAMES = new Set([
  "Basic User",
  "Select Authorized: Core + FollowUps",
  "Select Authorized: Core + Life Ledger",
  "Select Authorized: Core + REACH",
  "Select Authorized: Full Non-Admin",
]);

type Environment = typeof ENVIRONMENTS[number];
type AdminUserWithAccessLevel = AdminUser & {
  accessLevel?: "admin" | "select_authorized" | "basic";
};
type PermGrid = Record<string, Record<string, boolean>>;

function isBasicModule(module: string) {
  return BASIC_MODULES.includes(module as (typeof BASIC_MODULES)[number]);
}

function isAdminTarget(user: AdminUserWithAccessLevel) {
  return user.role === "admin" || user.accessLevel === "admin";
}

function getPermissionKey(permission: Pick<PermissionEntry, "module" | "environment">) {
  return `${permission.module}:${permission.environment}`;
}

function formatGrantLabel(permission: Pick<PermissionEntry, "module" | "environment">) {
  return `${MODULE_LABELS[permission.module] ?? permission.module} (${permission.environment})`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.data && typeof error.data === "object") {
    const record = error.data as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function groupPermissionsByModule(permissions: PermissionEntry[]) {
  const grouped: Record<string, string[]> = {};
  for (const permission of permissions) {
    if (!grouped[permission.module]) {
      grouped[permission.module] = [];
    }
    grouped[permission.module].push(permission.environment);
  }

  return MODULES.filter((module) => grouped[module]?.length).map((module) => ({
    module,
    environments: [...grouped[module]].sort(
      (a, b) => ENVIRONMENTS.indexOf(a as Environment) - ENVIRONMENTS.indexOf(b as Environment),
    ),
  }));
}

function PermissionBadges({ permissions }: { permissions: PermissionEntry[] }) {
  const grouped = groupPermissionsByModule(permissions);

  if (grouped.length === 0) {
    return <span className="text-xs text-muted-foreground">No access</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {grouped.map(({ module, environments }) => (
        <span
          key={module}
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium"
          data-testid={`badge-${module}`}
        >
          {MODULE_LABELS[module] ?? module}
          <span className="text-muted-foreground">({environments.map((environment) => environment[0]).join("")})</span>
        </span>
      ))}
    </div>
  );
}

function PermissionOverviewList({
  permissions,
  testId,
}: {
  permissions: PermissionEntry[];
  testId: string;
}) {
  const grouped = groupPermissionsByModule(permissions);

  return (
    <div className="space-y-2" data-testid={testId}>
      {grouped.map(({ module, environments }) => (
        <div
          key={module}
          className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2"
        >
          <span className="text-sm font-medium">{MODULE_LABELS[module] ?? module}</span>
          <span className="text-xs text-muted-foreground text-right capitalize">
            {environments.join(", ")}
          </span>
        </div>
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

function getAccessLevelLabel(user: AdminUserWithAccessLevel) {
  if (isAdminTarget(user)) return "Admin";
  if (user.accessLevel === "select_authorized") return "Select Authorized";
  return "Basic";
}

function getAccessLevelClass(user: AdminUserWithAccessLevel) {
  if (isAdminTarget(user)) return "bg-primary/10 text-primary";
  if (user.accessLevel === "select_authorized") return "bg-emerald-500/10 text-emerald-700";
  return "bg-muted text-muted-foreground";
}

function describeAccessLevelFromPermissions(permissions: PermissionEntry[]) {
  return permissions.some((permission) => !isBasicModule(permission.module))
    ? "Select Authorized"
    : "Basic";
}

function buildGrid(permissions: PermissionEntry[]): PermGrid {
  const grid: PermGrid = {};
  for (const module of MODULES) {
    grid[module] = {};
    for (const environment of ENVIRONMENTS) {
      grid[module][environment] = false;
    }
  }
  for (const permission of permissions) {
    if (grid[permission.module]) {
      grid[permission.module][permission.environment] = true;
    }
  }
  for (const module of BASIC_MODULES) {
    for (const environment of ENVIRONMENTS) {
      grid[module][environment] = true;
    }
  }
  return grid;
}

function gridToPermissions(grid: PermGrid): PermissionEntry[] {
  const permissions: PermissionEntry[] = [];
  for (const module of MODULES) {
    for (const environment of ENVIRONMENTS) {
      if (grid[module]?.[environment]) {
        permissions.push({ module, environment });
      }
    }
  }
  return permissions;
}

function buildPresetPlan(current: PermissionEntry[], preset: AccessPreset) {
  const nextPermissions = gridToPermissions(buildGrid(preset.permissions));
  const currentSet = new Set(current.map(getPermissionKey));
  const nextSet = new Set(nextPermissions.map(getPermissionKey));

  const added = nextPermissions.filter((permission) => !currentSet.has(getPermissionKey(permission)));
  const removed = current.filter((permission) => !nextSet.has(getPermissionKey(permission)));

  return {
    nextPermissions,
    added,
    removed,
    resultingAccessLevel: describeAccessLevelFromPermissions(nextPermissions),
  };
}

function UserListItem({
  user,
  onClick,
  isSelected,
}: {
  user: AdminUserWithAccessLevel;
  onClick: () => void;
  isSelected: boolean;
}) {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <button
      onClick={onClick}
      className={`w-full border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40 ${isSelected ? "bg-muted" : ""}`}
      data-testid={`user-row-${user.id}`}
    >
      <div className="flex items-center gap-3">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{displayName}</span>
            {user.role === "admin" && (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0 text-xs font-medium text-primary">admin</span>
            )}
            <span className={`shrink-0 rounded px-1.5 py-0 text-xs font-medium ${getAccessLevelClass(user)}`}>
              {getAccessLevelLabel(user)}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground" data-testid={`last-active-${user.id}`}>
              {formatRelativeTime(user.lastActiveAt)}
            </span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          <div className="mt-1">
            <PermissionBadges permissions={user.permissions} />
          </div>
        </div>
      </div>
    </button>
  );
}

function PermissionEditor({
  user,
  presets,
  onBack,
}: {
  user: AdminUserWithAccessLevel;
  presets: AccessPreset[];
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const readOnlyAdminTarget = isAdminTarget(user);

  const { data: permsData } = useGetAdminUserPermissions(user.id, {
    query: { queryKey: getGetAdminUserPermissionsQueryKey(user.id) },
  });

  const effectivePermissions = permsData?.permissions ?? user.permissions;
  const [grid, setGrid] = useState<PermGrid>(() => buildGrid(effectivePermissions));
  const [isDirty, setIsDirty] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<AccessPreset | null>(null);

  const putPermissions = usePutAdminUserPermissions();
  const applyPreset = useApplyAdminPreset();
  const createPreset = useCreateAdminPreset();
  const deletePreset = useDeleteAdminPreset();

  useEffect(() => {
    if (!isDirty) {
      setGrid(buildGrid(effectivePermissions));
    }
  }, [effectivePermissions, isDirty]);

  const currentPermissions = useMemo(() => gridToPermissions(grid), [grid]);
  const pendingPresetPlan = useMemo(
    () => (pendingPreset ? buildPresetPlan(currentPermissions, pendingPreset) : null),
    [currentPermissions, pendingPreset],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminUserPermissionsQueryKey(user.id) });
    queryClient.invalidateQueries({ queryKey: getListAdminPresetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
  };

  const toggle = (module: string, environment: string) => {
    if (isBasicModule(module) || readOnlyAdminTarget) return;
    setGrid((current) => ({
      ...current,
      [module]: { ...current[module], [environment]: !current[module][environment] },
    }));
    setIsDirty(true);
  };

  const toggleRow = (module: string) => {
    if (isBasicModule(module) || readOnlyAdminTarget) return;
    const allEnabled = ENVIRONMENTS.every((environment) => grid[module][environment]);
    setGrid((current) => ({
      ...current,
      [module]: Object.fromEntries(ENVIRONMENTS.map((environment) => [environment, !allEnabled])),
    }));
    setIsDirty(true);
  };

  const toggleCol = (environment: string) => {
    if (readOnlyAdminTarget) return;
    const assignableModules = MODULES.filter((module) => !isBasicModule(module));
    const allEnabled = assignableModules.every((module) => grid[module][environment]);
    setGrid((current) => {
      const next = { ...current };
      for (const module of assignableModules) {
        next[module] = { ...next[module], [environment]: !allEnabled };
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    putPermissions.mutate(
      { userId: user.id, data: { permissions: currentPermissions } },
      {
        onSuccess: () => {
          setIsDirty(false);
          invalidate();
          toast({
            title: "Access saved",
            description: `${displayName}'s module grants are updated.`,
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Could not save access",
            description: getErrorMessage(error, "The permission update failed."),
          });
        },
      },
    );
  };

  const handleConfirmApplyPreset = () => {
    if (!pendingPreset) return;
    applyPreset.mutate(
      { id: pendingPreset.id, userId: user.id },
      {
        onSuccess: (data) => {
          setGrid(buildGrid(data.permissions));
          setIsDirty(false);
          setPendingPreset(null);
          invalidate();
          toast({
            title: "Preset applied",
            description: `${pendingPreset.name} replaced the optional grants for ${displayName}.`,
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Could not apply preset",
            description: getErrorMessage(error, "The preset could not be applied."),
          });
        },
      },
    );
  };

  const handleSavePreset = () => {
    if (!presetName.trim() || readOnlyAdminTarget) return;
    setIsSavingPreset(true);
    createPreset.mutate(
      { data: { name: presetName.trim(), permissions: currentPermissions } },
      {
        onSuccess: () => {
          setPresetName("");
          setIsSavingPreset(false);
          invalidate();
          toast({
            title: "Preset saved",
            description: `Saved ${presetName.trim()} for future access changes.`,
          });
        },
        onError: (error) => {
          setIsSavingPreset(false);
          toast({
            variant: "destructive",
            title: "Could not save preset",
            description: getErrorMessage(error, "The preset could not be saved."),
          });
        },
      },
    );
  };

  const handleDeletePreset = (id: number) => {
    deletePreset.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({
            title: "Preset deleted",
            description: "The custom access preset was removed.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Could not delete preset",
            description: getErrorMessage(error, "The preset could not be deleted."),
          });
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-col gap-6" data-testid="permission-editor">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5" data-testid="button-back">
            <ChevronLeft className="h-4 w-4" />
            Users
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {readOnlyAdminTarget ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card shadow-sm" data-testid="admin-role-based-summary">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Role-based admin access</h3>
                <p className="mt-0.5 text-xs text-muted-foreground" data-testid="admin-role-based-message">
                  Admin access is role-based and comes from owner email or Clerk role metadata, not module grants.
                </p>
              </div>
              <div className="space-y-4 p-4">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Governance boundary</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This account already has full admin access. Presets and module toggles do not change admin eligibility.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Effective access</p>
                  <PermissionBadges permissions={effectivePermissions} />
                </div>
                <PermissionOverviewList permissions={effectivePermissions} testId="admin-read-only-permission-list" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="border-b px-4 py-3">
                  <h3 className="text-sm font-semibold">Module Access</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Daily, Weekly, and Vision are the Basic default. Toggle extra modules to make this account Select Authorized.
                  </p>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm" data-testid="permission-grid">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="w-36 px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Module</th>
                        {ENVIRONMENTS.map((environment) => (
                          <th key={environment} className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                            <button
                              onClick={() => toggleCol(environment)}
                              className="capitalize transition-colors hover:text-foreground"
                              data-testid={`toggle-col-${environment}`}
                            >
                              {environment}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((module) => (
                        <tr key={module} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleRow(module)}
                              disabled={isBasicModule(module)}
                              className={`text-left text-sm font-medium transition-colors ${isBasicModule(module) ? "cursor-default text-foreground" : "hover:text-muted-foreground"}`}
                              data-testid={`toggle-row-${module}`}
                            >
                              {MODULE_LABELS[module]}
                              {isBasicModule(module) && (
                                <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">Basic</span>
                              )}
                            </button>
                          </td>
                          {ENVIRONMENTS.map((environment) => (
                            <td key={environment} className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggle(module, environment)}
                                disabled={isBasicModule(module)}
                                className={`relative h-5 w-9 rounded-full transition-colors ${
                                  grid[module]?.[environment] ? "bg-primary" : "bg-muted"
                                } ${isBasicModule(module) ? "cursor-default opacity-70" : ""}`}
                                aria-label={`${grid[module]?.[environment] ? "Revoke" : "Grant"} ${MODULE_LABELS[module]} in ${environment}`}
                                data-testid={`toggle-${module}-${environment}`}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                    grid[module]?.[environment] ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-4 md:hidden" data-testid="permission-grid-mobile">
                  {MODULES.map((module) => {
                    const basicModule = isBasicModule(module);
                    const environmentsEnabled = ENVIRONMENTS.filter((environment) => grid[module]?.[environment]);
                    const allEnabled = ENVIRONMENTS.every((environment) => grid[module]?.[environment]);

                    return (
                      <div
                        key={module}
                        className="rounded-xl border bg-muted/15 p-3"
                        data-testid={`permission-card-${module}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              {MODULE_LABELS[module]}
                              {basicModule && (
                                <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">Basic</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {basicModule
                                ? "Included for every non-admin account."
                                : environmentsEnabled.length > 0
                                  ? `Enabled in ${environmentsEnabled.join(", ")}.`
                                  : "Not enabled in any environment."}
                            </p>
                          </div>
                          {!basicModule && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleRow(module)}
                              data-testid={`mobile-toggle-row-${module}`}
                            >
                              {allEnabled ? "Clear all" : "All environments"}
                            </Button>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {ENVIRONMENTS.map((environment) => (
                            <Button
                              key={environment}
                              type="button"
                              size="sm"
                              variant={grid[module]?.[environment] ? "default" : "outline"}
                              disabled={basicModule}
                              onClick={() => toggle(module, environment)}
                              className="justify-between capitalize"
                              data-testid={`mobile-toggle-${module}-${environment}`}
                            >
                              <span>{environment}</span>
                              <span className="text-[11px] uppercase tracking-wide">
                                {grid[module]?.[environment] ? "On" : "Off"}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden items-center justify-between border-t px-4 py-3 md:flex">
                  <p className="text-xs text-muted-foreground">
                    Click an optional module or environment header to toggle Select Authorized access.
                  </p>
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

              <div className="rounded-2xl border bg-card p-4 shadow-sm md:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Save access</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Basic stays locked. Saving updates only the optional module grants.
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={handleSave}
                  disabled={!isDirty || putPermissions.isPending}
                  data-testid="button-save-permissions-mobile"
                >
                  {putPermissions.isPending ? "Saving..." : "Save access"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border bg-card shadow-sm">
                <div className="border-b px-4 py-3">
                  <h3 className="text-sm font-semibold">Apply Preset</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Review the changes first. Applying a preset replaces the current optional grants.
                  </p>
                </div>
                <div className="p-2">
                  {presets.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">No presets yet</p>
                  ) : (
                    presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40"
                        data-testid={`preset-item-${preset.id}`}
                      >
                        <button
                          className="flex-1 text-left text-sm"
                          onClick={() => setPendingPreset(preset)}
                          data-testid={`button-apply-preset-${preset.id}`}
                        >
                          {preset.name}
                          <span className="ml-1.5 text-xs text-muted-foreground">({preset.permissions.length} grants)</span>
                        </button>
                        {!STANDARD_PRESET_NAMES.has(preset.name) && (
                          <button
                            onClick={() => handleDeletePreset(preset.id)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label={`Delete preset ${preset.name}`}
                            data-testid={`button-delete-preset-${preset.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-card shadow-sm">
                <div className="border-b px-4 py-3">
                  <h3 className="text-sm font-semibold">Save as Preset</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Save current grid as a named preset.</p>
                </div>
                <div className="space-y-2 p-4">
                  <Input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    placeholder="Preset name..."
                    className="h-8 text-sm"
                    data-testid="input-preset-name"
                    onKeyDown={(event) => event.key === "Enter" && handleSavePreset()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim() || isSavingPreset}
                    data-testid="button-save-preset"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isSavingPreset ? "Saving..." : "Save Preset"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={pendingPreset !== null} onOpenChange={(open) => { if (!open) setPendingPreset(null); }}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          data-testid="dialog-admin-preset-confirmation"
        >
          <DialogHeader>
            <DialogTitle>Review preset changes</DialogTitle>
            <DialogDescription>
              Confirm the full grant replacement before applying this preset.
            </DialogDescription>
          </DialogHeader>

          {pendingPreset && pendingPresetPlan && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Target user</p>
                  <p className="mt-1 text-sm font-medium" data-testid="admin-preset-target-user">{displayName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Preset</p>
                  <p className="mt-1 text-sm font-medium" data-testid="admin-preset-target-name">{pendingPreset.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Resulting access</p>
                  <p className="mt-1 text-sm font-medium" data-testid="admin-preset-resulting-access">
                    {pendingPresetPlan.resultingAccessLevel}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Warning</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Applying this preset replaces the current optional grants for this user.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4" data-testid="admin-preset-added">
                  <h3 className="text-sm font-semibold">Added grants</h3>
                  {pendingPresetPlan.added.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No new grants will be added.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {pendingPresetPlan.added.map((permission) => (
                        <li key={`added-${getPermissionKey(permission)}`}>{formatGrantLabel(permission)}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border p-4" data-testid="admin-preset-removed">
                  <h3 className="text-sm font-semibold">Removed grants</h3>
                  {pendingPresetPlan.removed.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No current grants will be removed.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {pendingPresetPlan.removed.map((permission) => (
                        <li key={`removed-${getPermissionKey(permission)}`}>{formatGrantLabel(permission)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPreset(null)} data-testid="button-cancel-apply-preset">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApplyPreset}
              disabled={applyPreset.isPending}
              data-testid="button-confirm-apply-preset"
            >
              {applyPreset.isPending ? "Applying..." : "Apply preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminPage() {
  const { data: users, isLoading: usersLoading } = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey() },
  });
  const { data: presets } = useListAdminPresets({
    query: { queryKey: getListAdminPresetsQueryKey() },
  });
  const { isSurfaceComplete } = useOnboardingProgress();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const usersWithAccess = users as AdminUserWithAccessLevel[] | undefined;

  const selectedUser = useMemo(
    () => usersWithAccess?.find((candidate) => candidate.id === selectedUserId) ?? null,
    [selectedUserId, usersWithAccess],
  );

  const filteredUsers = useMemo(() => {
    if (!usersWithAccess) return [];
    const query = search.toLowerCase();
    if (!query) return usersWithAccess;
    return usersWithAccess.filter((candidate) =>
      candidate.email.toLowerCase().includes(query) ||
      [candidate.firstName, candidate.lastName].filter(Boolean).join(" ").toLowerCase().includes(query),
    );
  }, [search, usersWithAccess]);

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <LaneHero
          label="Admin"
          title="Governance and access"
          subtitle="Control who can access each surface and save reusable permission presets for the workspace."
          compact
          headingTestId="text-admin-title"
        />

        {!isSurfaceComplete("admin") && <SurfaceOnboardingCard surface="admin" />}

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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="max-w-sm"
                data-testid="input-user-search"
              />
              <span className="text-sm text-muted-foreground" data-testid="text-user-count">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm" data-testid="users-list">
              {usersLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((index) => <Skeleton key={index} className="h-14 w-full" />)}
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
              <div className="rounded-2xl border bg-card shadow-sm">
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold">Access Presets</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Named permission groups — select a user to review and apply them.
                  </p>
                </div>
                <div className="divide-y">
                  {(presets ?? []).map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-start justify-between gap-3 px-4 py-3"
                      data-testid={`preset-overview-${preset.id}`}
                    >
                      <div>
                        <div className="text-sm font-medium">{preset.name}</div>
                        <div className="mt-1">
                          <PermissionBadges permissions={preset.permissions} />
                        </div>
                      </div>
                      <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">by {preset.createdBy}</span>
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
