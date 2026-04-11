import { Storage, File as GcsFile } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ObjectAclPolicy,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl.js";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

type StoredObjectRef =
  | { provider: "gcs"; file: GcsFile; objectPath: string; isPublic: boolean }
  | { provider: "r2"; key: string; objectPath: string; isPublic: boolean };

let r2Client: S3Client | null = null;

function isOnReplit(): boolean {
  return Boolean(process.env.REPL_ID);
}

function usingR2(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured.");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return r2Client;
}

function getR2BucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME not set.");
  }
  return bucketName;
}

function buildStorageClient(): Storage {
  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credJson) {
    let credentials: object;
    try {
      credentials = JSON.parse(Buffer.from(credJson, "base64").toString("utf-8"));
    } catch {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON is set but is not valid base64-encoded JSON.",
      );
    }
    return new Storage({ credentials });
  }

  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
}

export const objectStorageClient = buildStorageClient();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Configure public object search paths for storage.",
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set. Configure private object storage.");
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<StoredObjectRef | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath.replace(/\/$/, "")}/${filePath.replace(/^\//, "")}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const objectPath = this.toObjectPathFromStoragePath(`/${bucketName}/${objectName}`);

      if (usingR2()) {
        const exists = await this.r2Exists(objectName);
        if (exists) {
          return { provider: "r2", key: objectName, objectPath, isPublic: true };
        }
      } else {
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        const [exists] = await file.exists();
        if (exists) {
          return { provider: "gcs", file, objectPath, isPublic: true };
        }
      }
    }

    return null;
  }

  async downloadObject(ref: StoredObjectRef, cacheTtlSec = 3600): Promise<Response> {
    if (ref.provider === "r2") {
      const response = await getR2Client().send(
        new GetObjectCommand({
          Bucket: getR2BucketName(),
          Key: ref.key,
        }),
      );

      const body = response.Body as Readable | undefined;
      if (!body) {
        throw new ObjectNotFoundError();
      }

      const webStream = Readable.toWeb(body) as ReadableStream;
      const headers: Record<string, string> = {
        "Content-Type": response.ContentType || "application/octet-stream",
        "Cache-Control": `${ref.isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      };
      if (response.ContentLength) {
        headers["Content-Length"] = String(response.ContentLength);
      }
      return new Response(webStream, { headers });
    }

    const [metadata] = await ref.file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(ref.file);
    const isPublic = ref.isPublic || aclPolicy?.visibility === "public";

    const nodeStream = ref.file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async downloadObjectBuffer(ref: StoredObjectRef): Promise<Buffer> {
    if (ref.provider === "r2") {
      const response = await getR2Client().send(
        new GetObjectCommand({
          Bucket: getR2BucketName(),
          Key: ref.key,
        }),
      );
      const body = response.Body as AsyncIterable<Buffer> | undefined;
      if (!body) {
        throw new ObjectNotFoundError();
      }
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    const [buffer] = await ref.file.download();
    return buffer;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir().replace(/\/$/, "");
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    if (usingR2()) {
      return getSignedUrl(
        getR2Client(),
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        }),
        { expiresIn: 900 },
      );
    }

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObjectRef> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const storagePath = this.toStoragePathFromObjectPath(objectPath);
    const { bucketName, objectName } = parseObjectPath(storagePath);

    if (usingR2()) {
      const exists = await this.r2Exists(objectName);
      if (!exists) {
        throw new ObjectNotFoundError();
      }
      return { provider: "r2", key: objectName, objectPath, isPublic: false };
    }

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return { provider: "gcs", file, objectPath, isPublic: false };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    let candidate = rawPath;
    try {
      const url = new URL(rawPath);
      candidate = url.pathname;
      if (usingR2() && url.hostname.endsWith(".r2.cloudflarestorage.com")) {
        const bucketName = url.hostname.split(".")[0];
        candidate = `/${bucketName}${url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`}`;
      }
    } catch {
      candidate = rawPath;
    }
    return this.toObjectPathFromStoragePath(candidate);
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectRef = await this.getObjectEntityFile(normalizedPath);
    if (objectRef.provider === "gcs") {
      await setObjectAclPolicy(objectRef.file, aclPolicy);
    }
    return normalizedPath;
  }

  async deleteObject(ref: StoredObjectRef): Promise<void> {
    if (ref.provider === "r2") {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: getR2BucketName(),
          Key: ref.key,
        }),
      );
      return;
    }
    await ref.file.delete();
  }

  private async r2Exists(key: string): Promise<boolean> {
    try {
      await getR2Client().send(
        new HeadObjectCommand({
          Bucket: getR2BucketName(),
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private toStoragePathFromObjectPath(objectPath: string): string {
    const entityId = objectPath.replace(/^\/objects\//, "");
    let privateDir = this.getPrivateObjectDir();
    if (!privateDir.endsWith("/")) {
      privateDir = `${privateDir}/`;
    }
    return `${privateDir}${entityId.startsWith("/") ? entityId.slice(1) : entityId}`;
  }

  private toObjectPathFromStoragePath(rawPath: string): string {
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.startsWith("/")) {
      objectEntityDir = `/${objectEntityDir}`;
    }
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    const normalizedRawObjectPath = rawPath.startsWith("/")
      ? rawPath
      : `/${rawPath}`;

    if (!normalizedRawObjectPath.startsWith(objectEntityDir)) {
      return normalizedRawObjectPath;
    }

    const entityId = normalizedRawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  return {
    bucketName: pathParts[1],
    objectName: pathParts.slice(2).join("/"),
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  if (isOnReplit()) {
    return signViaReplitSidecar({ bucketName, objectName, method, ttlSec });
  }
  return signViaGcs({ bucketName, objectName, method, ttlSec });
}

async function signViaReplitSidecar({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: string;
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`,
    );
  }

  const data = (await response.json()) as { signed_url: string };
  return data.signed_url;
}

function mapMethodToGcsAction(method: string): "read" | "write" | "delete" | "resumable" {
  switch (method.toUpperCase()) {
    case "GET":
    case "HEAD":
      return "read";
    case "PUT":
    case "POST":
      return "write";
    case "DELETE":
      return "delete";
    default:
      throw new Error(`Unsupported HTTP method for GCS signed URL: ${method}`);
  }
}

async function signViaGcs({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: string;
  ttlSec: number;
}): Promise<string> {
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  const expires = Date.now() + ttlSec * 1000;

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: mapMethodToGcsAction(method),
    expires,
  });

  return url;
}
