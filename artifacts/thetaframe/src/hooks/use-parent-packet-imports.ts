import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuthSession } from "@/hooks/use-auth-session";

export const PARENT_PACKET_IMPORTS_QUERY_KEY = ["parent-packet-imports"] as const;

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
