import { useRef, useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useListReachFiles,
  useCreateReachFile,
  useDeleteReachFile,
  useRequestUploadUrl,
  getListReachFilesQueryKey,
  ReachFile,
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
import { Upload, Trash2, FileText, File, Image, FileArchive, ChevronDown, Search, X, ExternalLink } from "lucide-react";
import { ONBOARDING_QUERY_KEY, useOnboardingProgress } from "@/hooks/use-onboarding";
import { SurfaceOnboardingCard } from "@/components/surface-onboarding-card";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import {
  PARENT_PACKET_IMPORTS_QUERY_KEY,
  useCreateParentPacketImport,
} from "@/hooks/use-parent-packet-imports";

function fileIcon(fileType: string | null | undefined) {
  if (!fileType) return <File className="w-5 h-5 text-muted-foreground" />;
  if (fileType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
  if (
    fileType === "application/pdf" ||
    fileType.includes("document") ||
    fileType.startsWith("text/")
  )
    return <FileText className="w-5 h-5 text-orange-500" />;
  if (fileType.includes("zip") || fileType.includes("archive") || fileType.includes("tar"))
    return <FileArchive className="w-5 h-5 text-purple-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function coarseType(fileType: string | null | undefined): string {
  if (!fileType) return "Other";
  if (fileType.startsWith("image/")) return "Image";
  if (fileType === "application/pdf") return "PDF";
  if (fileType.startsWith("text/") || fileType.includes("document")) return "Document";
  if (fileType.includes("zip") || fileType.includes("archive") || fileType.includes("tar")) return "Archive";
  return "Other";
}

function getFileAccessUrl(objectPath: string): string {
  return `/api/storage${encodeURI(objectPath)}`;
}

function isArchiveFile(file: ReachFile): boolean {
  if (file.fileType?.includes("zip") || file.fileType?.includes("archive") || file.fileType?.includes("tar")) {
    return true;
  }
  return /\.zip$|\.tar$|\.tgz$|\.gz$/i.test(file.name);
}

function FileCard({
  file,
  onDelete,
  isDeleting,
  onImportPacket,
  isImportingPacket,
  canImportPacket,
}: {
  file: ReachFile;
  onDelete: () => void;
  isDeleting: boolean;
  onImportPacket?: () => void;
  isImportingPacket?: boolean;
  canImportPacket?: boolean;
}) {
  return (
    <div
      className="bg-card border rounded-xl p-4 flex items-start gap-4 shadow-sm group transition-shadow hover:shadow-md"
      data-testid={`file-card-${file.id}`}
    >
      <div className="shrink-0 mt-0.5">{fileIcon(file.fileType)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.name} data-testid={`file-name-${file.id}`}>
          {file.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          {file.fileType && <span className="capitalize">{coarseType(file.fileType)}</span>}
          {file.sizeBytes && <span>{formatBytes(file.sizeBytes)}</span>}
          <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}</span>
        </div>
        {file.notes && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{file.notes}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label="Delete file"
        className="shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        data-testid={`button-delete-file-${file.id}`}
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
      {canImportPacket && onImportPacket && (
        <Button
          variant="outline"
          size="sm"
          onClick={onImportPacket}
          disabled={Boolean(isImportingPacket)}
          className="shrink-0"
          data-testid={`button-import-parent-packet-${file.id}`}
        >
          {isImportingPacket ? "Importing..." : "Import Packet"}
        </Button>
      )}
      <Button asChild variant="ghost" size="icon" aria-label="Open file" className="shrink-0" data-testid={`link-open-file-${file.id}`}>
        <a href={getFileAccessUrl(file.objectPath)} target="_blank" rel="noreferrer">
          <ExternalLink className="w-4 h-4" />
        </a>
      </Button>
    </div>
  );
}

export default function ReachPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = usePermissions();
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});
  const [stagedFiles, setStagedFiles] = useState<Array<{ id: string; file: File }>>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");

  const { data: files, isLoading } = useListReachFiles({
    query: { queryKey: getListReachFilesQueryKey() },
  });

  const requestUploadUrl = useRequestUploadUrl();
  const createFileMutation = useCreateReachFile();
  const deleteFileMutation = useDeleteReachFile();
  const importParentPacketMutation = useCreateParentPacketImport();
  const { isSurfaceComplete } = useOnboardingProgress();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListReachFilesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PARENT_PACKET_IMPORTS_QUERY_KEY }),
    ]);

  const typeOptions = useMemo(() => {
    const types = new Set((files ?? []).map((f) => coarseType(f.fileType)));
    return ["All", ...Array.from(types).sort()];
  }, [files]);

  const filteredFiles = useMemo(() => {
    let list = files ?? [];
    if (filterType !== "All") list = list.filter((f) => coarseType(f.fileType) === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.notes ?? "").toLowerCase().includes(q) ||
          (f.fileType ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [files, filterType, searchQuery]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      file,
    }));
    setStagedFiles(selected);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      for (const { id, file } of stagedFiles) {
        const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" },
        });

        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed for ${file.name}: ${uploadRes.status}`);
        }

        await createFileMutation.mutateAsync({
          data: {
            name: file.name,
            fileType: file.type || null,
            sizeBytes: file.size,
            objectPath,
            notes: pendingNotes[id] || null,
          },
        });
      }

      setStagedFiles([]);
      setPendingNotes({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      await invalidate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    deleteFileMutation.mutate({ id }, {
      onSuccess: () => {
        setDeletingId(null);
        invalidate();
      },
      onError: () => setDeletingId(null),
    });
  };

  const handleImportPacket = async (file: ReachFile) => {
    setImportingId(file.id);
    try {
      const run = await importParentPacketMutation.mutateAsync(file.id);
      await invalidate();
      toast({
        title: "Parent packet imported",
        description: `${run.summary.materializedEntryCount} Baby KB entries materialized from ${run.sourceReachFileName}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The parent packet could not be imported.";
      toast({
        title: "Parent packet import failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-reach-title">REACH</h1>
          <p className="text-muted-foreground mt-1">Keep the files you need close at hand so they can be uploaded, opened, and reused without hunting for them.</p>
        </header>

        {!isSurfaceComplete("reach") && <SurfaceOnboardingCard surface="reach" />}

        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5" data-testid="upload-panel">
          <h2 className="text-base font-semibold">Upload Files</h2>

          <div
            className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-10 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            data-testid="drop-zone"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to select files</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file"
            />
          </div>

          {stagedFiles.length > 0 && (
            <div className="space-y-3" data-testid="staged-files-list">
              <p className="text-sm font-medium">{stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""} selected</p>
              {stagedFiles.map(({ id, file }) => (
                <div key={id} className="space-y-1.5" data-testid={`staged-file-${id}`}>
                  <div className="flex items-center gap-3 text-sm">
                    {fileIcon(file.type)}
                    <span className="font-medium flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStagedFiles((prev) => prev.filter((x) => x.id !== id))}
                      data-testid={`button-remove-staged-${id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea
                    value={pendingNotes[id] ?? ""}
                    onChange={(e) =>
                      setPendingNotes((n) => ({ ...n, [id]: e.target.value }))
                    }
                    placeholder="Optional note for this file..."
                    className="resize-none h-16 text-xs"
                    data-testid={`textarea-notes-${id}`}
                  />
                </div>
              ))}

              {uploadError && (
                <p className="text-sm text-destructive" data-testid="upload-error">{uploadError}</p>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading}
                data-testid="button-upload"
              >
                {uploading ? "Uploading..." : `Upload ${stagedFiles.length} file${stagedFiles.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3" data-testid="file-filters">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-9"
              data-testid="input-search-files"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-search"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {typeOptions.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="filter-type-trigger">
                  {filterType === "All" ? "All types" : filterType}
                  <ChevronDown className="w-3 h-3 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {typeOptions.map((t) => (
                  <DropdownMenuItem
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={filterType === t ? "font-semibold" : ""}
                    data-testid={`filter-type-${t.toLowerCase()}`}
                  >
                    {t}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="space-y-3" data-testid="files-list">
            <p className="text-sm text-muted-foreground">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
              {(searchQuery || filterType !== "All") ? " matching filters" : ""}
            </p>
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={() => handleDelete(file.id)}
                isDeleting={deletingId === file.id}
                canImportPacket={isAdmin && isArchiveFile(file)}
                isImportingPacket={importingId === file.id}
                onImportPacket={() => handleImportPacket(file)}
              />
            ))}
          </div>
        ) : files && files.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state-filtered">
            <p className="text-muted-foreground">No files match the current filters.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearchQuery(""); setFilterType("All"); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
            <p className="text-muted-foreground">No files uploaded yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
