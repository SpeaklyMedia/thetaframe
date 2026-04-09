import { useRef, useState } from "react";
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
import { Upload, Trash2, FileText, File, Image, FileArchive } from "lucide-react";

function fileIcon(fileType: string | null | undefined) {
  if (!fileType) return <File className="w-5 h-5 text-muted-foreground" />;
  if (fileType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
  if (fileType === "application/pdf" || fileType.includes("document") || fileType.includes("text"))
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

function FileCard({
  file,
  onDelete,
  isDeleting,
}: {
  file: ReachFile;
  onDelete: () => void;
  isDeleting: boolean;
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
          {file.fileType && <span>{file.fileType}</span>}
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
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid={`button-delete-file-${file.id}`}
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function ReachPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: files, isLoading } = useListReachFiles({
    query: { queryKey: getListReachFilesQueryKey() },
  });

  const requestUploadUrl = useRequestUploadUrl();
  const createFileMutation = useCreateReachFile();
  const deleteFileMutation = useDeleteReachFile();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListReachFilesQueryKey() });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    setStagedFiles(selected);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      for (const file of stagedFiles) {
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
            notes: pendingNotes[file.name] || null,
          },
        });
      }

      setStagedFiles([]);
      setPendingNotes({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      invalidate();
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

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-reach-title">REACH</h1>
          <p className="text-muted-foreground mt-1">File bundle manager</p>
        </header>

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
              {stagedFiles.map((f) => (
                <div key={f.name} className="space-y-1.5" data-testid={`staged-file-${f.name}`}>
                  <div className="flex items-center gap-3 text-sm">
                    {fileIcon(f.type)}
                    <span className="font-medium flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStagedFiles((prev) => prev.filter((x) => x.name !== f.name))}
                      data-testid={`button-remove-staged-${f.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea
                    value={pendingNotes[f.name] ?? ""}
                    onChange={(e) =>
                      setPendingNotes((n) => ({ ...n, [f.name]: e.target.value }))
                    }
                    placeholder="Optional note for this file..."
                    className="resize-none h-16 text-xs"
                    data-testid={`textarea-notes-${f.name}`}
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

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : files && files.length > 0 ? (
          <div className="space-y-3" data-testid="files-list">
            <p className="text-sm text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</p>
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={() => handleDelete(file.id)}
                isDeleting={deletingId === file.id}
              />
            ))}
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
