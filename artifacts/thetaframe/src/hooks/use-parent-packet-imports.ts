import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuthSession } from "@/hooks/use-auth-session";

export const PARENT_PACKET_IMPORTS_QUERY_KEY = ["parent-packet-imports"] as const;
export const PARENT_PACKET_MATERIALIZATIONS_QUERY_KEY = ["parent-packet-materializations"] as const;
export const BABY_KB_PROMOTIONS_QUERY_KEY = ["baby-kb-promotions"] as const;

export type ParentPacketImportFileSummary = {
  sourcePath: string;
  entryCount: number;
};

export type ParentPacketImportSummary = {
  packetKey: string;
  packetVersion: string;
  sourceReachFileId: number;
  sourceReachFileName: string;
  materializedEntryCount: number;
  createdCount: number;
  updatedCount: number;
  sourceFileCount: number;
  files: ParentPacketImportFileSummary[];
};

export type ParentPacketImportRun = {
  id: number;
  packetKey: string;
  packetVersion: string;
  importScope: string;
  status: string;
  sourceReachFileId: number;
  sourceReachFileName: string;
  sourceObjectPath: string;
  summary: ParentPacketImportSummary;
  createdAt: string;
  updatedAt: string;
};

export type ParentPacketMaterialization = {
  id: number;
  latestImportRunId: number;
  sourceReachFileId: number;
  packetKey: string;
  sourcePath: string;
  sourceRecordKey: string;
  targetKind: string;
  targetTab: string;
  targetEntryId: number;
  contentType: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BabyKbPromotion = {
  id: number;
  sourceEntryId: number;
  sourceMaterializationId: number | null;
  targetSurface: "daily" | "weekly" | "vision";
  targetContainerKey: string;
  targetRecordId: number;
  targetItemId: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  existing?: boolean;
};

export type BabyKbBulkUpdateResult = {
  updatedCount: number;
  updatedIds: number[];
};

export function useParentPacketImports(enabled = true) {
  const { status, userId } = useAuthSession();

  return useQuery<ParentPacketImportRun[]>({
    queryKey: PARENT_PACKET_IMPORTS_QUERY_KEY,
    queryFn: () => customFetch<ParentPacketImportRun[]>("/api/admin/parent-packet-imports", { responseType: "json" }),
    enabled: enabled && status === "ready" && Boolean(userId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useParentPacketMaterializations(enabled = true) {
  const { status, userId } = useAuthSession();

  return useQuery<ParentPacketMaterialization[]>({
    queryKey: PARENT_PACKET_MATERIALIZATIONS_QUERY_KEY,
    queryFn: () =>
      customFetch<ParentPacketMaterialization[]>("/api/admin/parent-packet-materializations", { responseType: "json" }),
    enabled: enabled && status === "ready" && Boolean(userId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useBabyKbPromotions(enabled = true) {
  const { status, userId } = useAuthSession();

  return useQuery<BabyKbPromotion[]>({
    queryKey: BABY_KB_PROMOTIONS_QUERY_KEY,
    queryFn: () => customFetch<BabyKbPromotion[]>("/api/admin/baby-kb/promotions", { responseType: "json" }),
    enabled: enabled && status === "ready" && Boolean(userId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateParentPacketImport() {
  return useMutation({
    mutationFn: async (reachFileId: number) =>
      customFetch<ParentPacketImportRun>("/api/admin/parent-packet-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reachFileId }),
        responseType: "json",
      }),
  });
}

export function useCreateBabyKbPromotion() {
  return useMutation({
    mutationFn: async (payload: {
      sourceEntryId: number;
      targetSurface: "daily" | "weekly" | "vision";
      targetContainerKey: string;
    }) =>
      customFetch<BabyKbPromotion>("/api/admin/baby-kb/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        responseType: "json",
      }),
  });
}

export function useBulkUpdateBabyKbEntries() {
  return useMutation({
    mutationFn: async (payload: {
      entryIds: number[];
      operation: "mark-verified" | "add-tag" | "remove-tag";
      tag?: string;
    }) =>
      customFetch<BabyKbBulkUpdateResult>("/api/admin/baby-kb/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        responseType: "json",
      }),
  });
}
