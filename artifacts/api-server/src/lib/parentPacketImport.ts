import { unzipSync } from "fflate";
import { parse as parseCsv } from "csv-parse/sync";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  lifeLedgerBabyTable,
  parentPacketImportRunsTable,
  parentPacketMaterializationsTable,
  type ReachFile,
} from "@workspace/db/schema";
import { ObjectStorageService } from "./objectStorage.js";

const objectStorageService = new ObjectStorageService();
const textDecoder = new TextDecoder("utf-8");

export const PARENT_PACKET_KEY = "SESSION_4_REVIEW_GATE__20260324_R1";
export const PARENT_PACKET_VERSION = "20260324_R1";
export const PARENT_PACKET_IMPORT_SCOPE = "broader-dual-layer";

const MARKDOWN_SOURCE_PATHS = [
  "BABY_KB/BABY_KB_MASTER.md",
  "BABY_KB/CARE_TIMELINE.md",
  "BABY_KB/INFANT_DEVELOPMENT_FRAMEWORK.md",
  "BABY_KB/INSURANCE_AND_ADMIN_CHECKPOINTS.md",
  "BABY_KB/BABY_KB_GAPS_AND_UNKNOWNS.md",
];

const CSV_SOURCE_PATHS = [
  "STRUCTURED_DATA/baby_kb_categories.csv",
  "STRUCTURED_DATA/baby_kb_appointments_and_screenings.csv",
  "STRUCTURED_DATA/baby_kb_milestones.csv",
  "STRUCTURED_DATA/family_planning.csv",
  "STRUCTURED_DATA/life_admin.csv",
  "STRUCTURED_DATA/infant_development_framework.csv",
  "STRUCTURED_DATA/insurance_and_admin_checkpoints.csv",
];

type PacketEntry = {
  sourcePath: string;
  sourceRecordKey: string;
  name: string;
  notes: string;
  contentType: "framework" | "reference" | "planning" | "must-verify";
  tags: string[];
  metadata: Record<string, unknown>;
};

type ImportSummary = {
  packetKey: string;
  packetVersion: string;
  sourceReachFileId: number;
  sourceReachFileName: string;
  materializedEntryCount: number;
  createdCount: number;
  updatedCount: number;
  sourceFileCount: number;
  files: Array<{ sourcePath: string; entryCount: number }>;
};

let parentPacketSchemaReady: Promise<void> | null = null;

async function ensureParentPacketSchema(): Promise<void> {
  if (!parentPacketSchemaReady) {
    parentPacketSchemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS parent_packet_import_runs (
          id serial PRIMARY KEY,
          uploader_user_id text NOT NULL,
          source_reach_file_id integer NOT NULL,
          source_reach_file_name text NOT NULL,
          source_object_path text NOT NULL,
          packet_key text NOT NULL,
          packet_version text NOT NULL,
          import_scope text NOT NULL,
          status text NOT NULL DEFAULT 'completed',
          summary jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS parent_packet_materializations (
          id serial PRIMARY KEY,
          latest_import_run_id integer NOT NULL,
          source_reach_file_id integer NOT NULL,
          packet_key text NOT NULL,
          source_path text NOT NULL,
          source_record_key text NOT NULL DEFAULT '',
          target_kind text NOT NULL,
          target_tab text NOT NULL,
          target_entry_id integer NOT NULL,
          content_type text NOT NULL,
          status text NOT NULL DEFAULT 'materialized',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS parent_packet_materializations_source_idx
        ON parent_packet_materializations (packet_key, source_path, source_record_key)
      `);
    })().catch((error) => {
      parentPacketSchemaReady = null;
      throw error;
    });
  }

  await parentPacketSchemaReady;
}

function normalizeZipPath(path: string): string {
  return path.replace(/^SESSION_4_REVIEW_GATE__20260324_R1\//, "");
}

function decodeText(buffer: Uint8Array | undefined): string {
  if (!buffer) {
    throw new Error("Required packet file missing");
  }
  return textDecoder.decode(buffer);
}

function makeMetadata(
  sourcePath: string,
  sourceRecordKey: string,
  contentType: PacketEntry["contentType"],
  extras: Record<string, unknown>,
) {
  return {
    packetKey: PARENT_PACKET_KEY,
    packetVersion: PARENT_PACKET_VERSION,
    sourcePath,
    sourceRecordKey,
    contentType,
    ...extras,
  };
}

function dedupeTags(tags: Array<string | null | undefined>): string[] {
  return Array.from(new Set(tags.filter((tag): tag is string => Boolean(tag && tag.trim())).map((tag) => tag.trim())));
}

function statusTag(status: string | undefined): string {
  return status?.toLowerCase().includes("must verify") ? "Needs verification" : "Known now";
}

function statusType(status: string | undefined): PacketEntry["contentType"] {
  return status?.toLowerCase().includes("must verify") ? "must-verify" : "framework";
}

function titleFromPath(sourcePath: string): string {
  return sourcePath
    .split("/")
    .pop()
    ?.replace(/\.md$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase()) ?? sourcePath;
}

function formatImportedTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("_")) {
    return trimmed
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }
  return trimmed;
}

function preferredTitle(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return formatImportedTitle(value);
    }
  }
  return "Baby KB entry";
}

function parsePacketEntries(zipBytes: Buffer): PacketEntry[] {
  const contents = unzipSync(new Uint8Array(zipBytes));
  const entries: PacketEntry[] = [];

  for (const sourcePath of MARKDOWN_SOURCE_PATHS) {
    const body = decodeText(contents[`SESSION_4_REVIEW_GATE__20260324_R1/${sourcePath}`]);
    const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? titleFromPath(sourcePath);
    const lower = sourcePath.toLowerCase();
    const tags = dedupeTags([
      "Imported from packet",
      "Framework",
      lower.includes("gaps") ? "Needs verification" : null,
      lower.includes("timeline") ? "Planning timeline" : null,
      lower.includes("insurance") ? "Insurance" : null,
      lower.includes("development") ? "Development" : null,
      lower.includes("baby_kb_master") ? "Parent planning" : null,
    ]);
    const contentType: PacketEntry["contentType"] = lower.includes("gaps") ? "must-verify" : lower.includes("timeline") ? "planning" : "reference";
    entries.push({
      sourcePath,
      sourceRecordKey: title,
      name: title,
      notes: body,
      contentType,
      tags,
      metadata: makeMetadata(sourcePath, title, contentType, {}),
    });
  }

  const addCsvEntries = (sourcePath: string, builder: (record: Record<string, string>) => PacketEntry | null) => {
    const raw = decodeText(contents[`SESSION_4_REVIEW_GATE__20260324_R1/${sourcePath}`]);
    const records = parseCsv(raw, { columns: true, skip_empty_lines: true, bom: true }) as Array<Record<string, string>>;
    for (const record of records) {
      const built = builder(record);
      if (built) entries.push(built);
    }
  };

  addCsvEntries("STRUCTURED_DATA/baby_kb_categories.csv", (record) => {
    const key = `${record.module}::${record.category}`;
    const knownStatus = record.known_now_or_verify_later;
    const contentType = statusType(knownStatus);
    return {
      sourcePath: "STRUCTURED_DATA/baby_kb_categories.csv",
      sourceRecordKey: key,
      name: `${record.module}: ${record.category}`,
      notes: [
        `Planning status: ${record.planning_status}`,
        `Evidence state: ${knownStatus}`,
        record.notes ? `Notes: ${record.notes}` : null,
      ].filter(Boolean).join("\n"),
      contentType,
      tags: dedupeTags(["Imported from packet", "Framework", statusTag(knownStatus), record.module]),
      metadata: makeMetadata("STRUCTURED_DATA/baby_kb_categories.csv", key, contentType, {
        module: record.module,
        category: record.category,
        planningStatus: record.planning_status,
        knownStatus,
      }),
    };
  });

  addCsvEntries("STRUCTURED_DATA/baby_kb_appointments_and_screenings.csv", (record) => {
    const key = `${record.phase}::${record.item}`;
    const knownStatus = record.known_now_or_verify_later;
    const contentType = statusType(knownStatus) === "must-verify" ? "must-verify" : "planning";
    return {
      sourcePath: "STRUCTURED_DATA/baby_kb_appointments_and_screenings.csv",
      sourceRecordKey: key,
      name: preferredTitle(record.item, record.standard_status, record.timing_window, record.phase),
      notes: [
        `Phase: ${record.phase}`,
        `Timing window: ${record.timing_window}`,
        `Standard status: ${record.standard_status}`,
        `Source basis: ${record.source_basis}`,
        `Cost dependency: ${record.cost_dependency}`,
        `Evidence state: ${knownStatus}`,
        record.notes ? `Notes: ${record.notes}` : null,
      ].filter(Boolean).join("\n"),
      contentType,
      tags: dedupeTags(["Imported from packet", "Planning", statusTag(knownStatus), record.phase]),
      metadata: makeMetadata("STRUCTURED_DATA/baby_kb_appointments_and_screenings.csv", key, contentType, {
        phase: record.phase,
        timingWindow: record.timing_window,
        standardStatus: record.standard_status,
        knownStatus,
      }),
    };
  });

  addCsvEntries("STRUCTURED_DATA/baby_kb_milestones.csv", (record) => {
    const key = `${record.phase}::${record.item}`;
    const knownStatus = record.known_now_or_verify_later;
    const contentType = statusType(knownStatus) === "must-verify" ? "must-verify" : "planning";
    return {
      sourcePath: "STRUCTURED_DATA/baby_kb_milestones.csv",
      sourceRecordKey: key,
      name: preferredTitle(record.item, record.checkpoint, record.milestone_type, record.timing_window, record.phase),
      notes: [
        `Phase: ${record.phase}`,
        record.checkpoint ? `Checkpoint: ${record.checkpoint}` : null,
        `Milestone type: ${record.milestone_type}`,
        `Timing window: ${record.timing_window}`,
        `Standard status: ${record.standard_status}`,
        `Source basis: ${record.source_basis}`,
        `Cost dependency: ${record.cost_dependency}`,
        `Evidence state: ${knownStatus}`,
        record.notes ? `Notes: ${record.notes}` : null,
      ].filter(Boolean).join("\n"),
      contentType,
      tags: dedupeTags(["Imported from packet", "Milestone", statusTag(knownStatus), record.phase]),
      metadata: makeMetadata("STRUCTURED_DATA/baby_kb_milestones.csv", key, contentType, {
        phase: record.phase,
        milestoneType: record.milestone_type,
        timingWindow: record.timing_window,
        knownStatus,
      }),
    };
  });

  addCsvEntries("STRUCTURED_DATA/family_planning.csv", (record) => {
    const key = `${record.Category}::${record["Topic / Decision"]}`;
    return {
      sourcePath: "STRUCTURED_DATA/family_planning.csv",
      sourceRecordKey: key,
      name: preferredTitle(record["Topic / Decision"], record.Category, record["Question or Need"]),
      notes: [
        `Category: ${record.Category}`,
        `Question or need: ${record["Question or Need"]}`,
        `Timing: ${record.Timing}`,
        `Status: ${record.Status}`,
        `Owner: ${record.Owner}`,
        `Next action: ${record["Next Action"]}`,
        record.Notes ? `Notes: ${record.Notes}` : null,
      ].filter(Boolean).join("\n"),
      contentType: "planning",
      tags: dedupeTags(["Imported from packet", "Planning", record.Category, record.Status]),
      metadata: makeMetadata("STRUCTURED_DATA/family_planning.csv", key, "planning", {
        category: record.Category,
        timing: record.Timing,
        status: record.Status,
      }),
    };
  });

  addCsvEntries("STRUCTURED_DATA/life_admin.csv", (record) => {
    const key = `${record.Cluster}::${record.Item}`;
    return {
      sourcePath: "STRUCTURED_DATA/life_admin.csv",
      sourceRecordKey: key,
      name: preferredTitle(record.Item, record.Cluster, record["Suggested Next Step"]),
      notes: [
        `Cluster: ${record.Cluster}`,
        `Linked area: ${record["Linked Area"]}`,
        `Timing bucket: ${record["Timing Bucket"]}`,
        `Priority: ${record.Priority}`,
        `Status: ${record.Status}`,
        `Owner: ${record.Owner}`,
        `Dependency / materials: ${record["Dependency / Materials"]}`,
        `Suggested next step: ${record["Suggested Next Step"]}`,
        record.Notes ? `Notes: ${record.Notes}` : null,
      ].filter(Boolean).join("\n"),
      contentType: "planning",
      tags: dedupeTags(["Imported from packet", "Planning", record.Cluster, record.Priority, record.Status]),
      metadata: makeMetadata("STRUCTURED_DATA/life_admin.csv", key, "planning", {
        cluster: record.Cluster,
        timingBucket: record["Timing Bucket"],
        priority: record.Priority,
      }),
    };
  });

  addCsvEntries("STRUCTURED_DATA/infant_development_framework.csv", (record) => {
    const key = Object.values(record).join("::");
    return {
      sourcePath: "STRUCTURED_DATA/infant_development_framework.csv",
      sourceRecordKey: key,
      name: record.category ?? record.phase ?? "Infant development framework",
      notes: Object.entries(record).map(([k, v]) => `${k}: ${v}`).join("\n"),
      contentType: "framework",
      tags: dedupeTags(["Imported from packet", "Framework", "Development"]),
      metadata: makeMetadata("STRUCTURED_DATA/infant_development_framework.csv", key, "framework", record),
    };
  });

  addCsvEntries("STRUCTURED_DATA/insurance_and_admin_checkpoints.csv", (record) => {
    const key = Object.values(record).join("::");
    const knownStatus = record.known_now_or_verify_later ?? record["known_now_or_verify_later"];
    const contentType = knownStatus ? statusType(knownStatus) : "planning";
    return {
      sourcePath: "STRUCTURED_DATA/insurance_and_admin_checkpoints.csv",
      sourceRecordKey: key,
      name: preferredTitle(record.checkpoint, record.item, record.category, record.timing_window),
      notes: Object.entries(record).map(([k, v]) => `${k}: ${v}`).join("\n"),
      contentType,
      tags: dedupeTags(["Imported from packet", "Planning", "Insurance", knownStatus ? statusTag(knownStatus) : null]),
      metadata: makeMetadata("STRUCTURED_DATA/insurance_and_admin_checkpoints.csv", key, contentType, record),
    };
  });

  return entries;
}

export async function listParentPacketImportRunsForUser(userId: string) {
  await ensureParentPacketSchema();

  const runs = await db
    .select()
    .from(parentPacketImportRunsTable)
    .where(eq(parentPacketImportRunsTable.uploaderUserId, userId))
    .orderBy(sql`${parentPacketImportRunsTable.createdAt} DESC`);

  return runs.map((run) => ({
    id: run.id,
    packetKey: run.packetKey,
    packetVersion: run.packetVersion,
    importScope: run.importScope,
    status: run.status,
    sourceReachFileId: run.sourceReachFileId,
    sourceReachFileName: run.sourceReachFileName,
    sourceObjectPath: run.sourceObjectPath,
    summary: run.summary as ImportSummary,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }));
}

export async function listParentPacketMaterializationsForUser(userId: string) {
  await ensureParentPacketSchema();

  const rows = await db
    .select({
      id: parentPacketMaterializationsTable.id,
      latestImportRunId: parentPacketMaterializationsTable.latestImportRunId,
      sourceReachFileId: parentPacketMaterializationsTable.sourceReachFileId,
      packetKey: parentPacketMaterializationsTable.packetKey,
      sourcePath: parentPacketMaterializationsTable.sourcePath,
      sourceRecordKey: parentPacketMaterializationsTable.sourceRecordKey,
      targetKind: parentPacketMaterializationsTable.targetKind,
      targetTab: parentPacketMaterializationsTable.targetTab,
      targetEntryId: parentPacketMaterializationsTable.targetEntryId,
      contentType: parentPacketMaterializationsTable.contentType,
      status: parentPacketMaterializationsTable.status,
      metadata: parentPacketMaterializationsTable.metadata,
      createdAt: parentPacketMaterializationsTable.createdAt,
      updatedAt: parentPacketMaterializationsTable.updatedAt,
    })
    .from(parentPacketMaterializationsTable)
    .innerJoin(
      parentPacketImportRunsTable,
      eq(parentPacketMaterializationsTable.latestImportRunId, parentPacketImportRunsTable.id),
    )
    .where(eq(parentPacketImportRunsTable.uploaderUserId, userId))
    .orderBy(parentPacketMaterializationsTable.sourcePath, parentPacketMaterializationsTable.sourceRecordKey);

  return rows.map((row) => ({
    ...row,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function importParentPacketFromReachFile(
  sourceFile: ReachFile,
  uploaderUserId: string,
) {
  await ensureParentPacketSchema();

  const objectFile = await objectStorageService.getObjectEntityFile(sourceFile.objectPath);
  const zipBytes = await objectStorageService.downloadObjectBuffer(objectFile);
  const packetEntries = parsePacketEntries(zipBytes);

  const [run] = await db
    .insert(parentPacketImportRunsTable)
    .values({
      uploaderUserId,
      sourceReachFileId: sourceFile.id,
      sourceReachFileName: sourceFile.name,
      sourceObjectPath: sourceFile.objectPath,
      packetKey: PARENT_PACKET_KEY,
      packetVersion: PARENT_PACKET_VERSION,
      importScope: PARENT_PACKET_IMPORT_SCOPE,
      status: "running",
      summary: {},
    })
    .returning();

  let createdCount = 0;
  let updatedCount = 0;
  const perFileCounts = new Map<string, number>();

  for (const entry of packetEntries) {
    perFileCounts.set(entry.sourcePath, (perFileCounts.get(entry.sourcePath) ?? 0) + 1);

    const [existingMaterialization] = await db
      .select()
      .from(parentPacketMaterializationsTable)
      .where(
        and(
          eq(parentPacketMaterializationsTable.packetKey, PARENT_PACKET_KEY),
          eq(parentPacketMaterializationsTable.sourcePath, entry.sourcePath),
          eq(parentPacketMaterializationsTable.sourceRecordKey, entry.sourceRecordKey),
        ),
      );

    let targetEntryId: number;

    if (existingMaterialization) {
      const [updatedEntry] = await db
        .update(lifeLedgerBabyTable)
        .set({
          name: entry.name,
          notes: entry.notes,
          tags: entry.tags,
          updatedAt: new Date(),
        })
        .where(eq(lifeLedgerBabyTable.id, existingMaterialization.targetEntryId))
        .returning();

      if (updatedEntry) {
        updatedCount += 1;
        targetEntryId = updatedEntry.id;
      } else {
        const [createdEntry] = await db
          .insert(lifeLedgerBabyTable)
          .values({
            userId: uploaderUserId,
            tab: "baby",
            name: entry.name,
            notes: entry.notes,
            tags: entry.tags,
          })
          .returning();

        createdCount += 1;
        targetEntryId = createdEntry.id;
      }
    } else {
      const [createdEntry] = await db
        .insert(lifeLedgerBabyTable)
        .values({
          userId: uploaderUserId,
          tab: "baby",
          name: entry.name,
          notes: entry.notes,
          tags: entry.tags,
        })
        .returning();

      createdCount += 1;
      targetEntryId = createdEntry.id;
    }

    await db
      .insert(parentPacketMaterializationsTable)
      .values({
        latestImportRunId: run.id,
        sourceReachFileId: sourceFile.id,
        packetKey: PARENT_PACKET_KEY,
        sourcePath: entry.sourcePath,
        sourceRecordKey: entry.sourceRecordKey,
        targetKind: "life-ledger-entry",
        targetTab: "baby",
        targetEntryId,
        contentType: entry.contentType,
        status: "materialized",
        metadata: entry.metadata,
      })
      .onConflictDoUpdate({
        target: [
          parentPacketMaterializationsTable.packetKey,
          parentPacketMaterializationsTable.sourcePath,
          parentPacketMaterializationsTable.sourceRecordKey,
        ],
        set: {
          latestImportRunId: run.id,
          sourceReachFileId: sourceFile.id,
          targetEntryId,
          contentType: entry.contentType,
          status: "materialized",
          metadata: entry.metadata,
          updatedAt: new Date(),
        },
      });
  }

  const summary: ImportSummary = {
    packetKey: PARENT_PACKET_KEY,
    packetVersion: PARENT_PACKET_VERSION,
    sourceReachFileId: sourceFile.id,
    sourceReachFileName: sourceFile.name,
    materializedEntryCount: packetEntries.length,
    createdCount,
    updatedCount,
    sourceFileCount: perFileCounts.size,
    files: Array.from(perFileCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sourcePath, entryCount]) => ({ sourcePath, entryCount })),
  };

  const [finalRun] = await db
    .update(parentPacketImportRunsTable)
    .set({
      status: "completed",
      summary,
      updatedAt: new Date(),
    })
    .where(eq(parentPacketImportRunsTable.id, run.id))
    .returning();

  return {
    id: finalRun.id,
    packetKey: finalRun.packetKey,
    packetVersion: finalRun.packetVersion,
    importScope: finalRun.importScope,
    status: finalRun.status,
    sourceReachFileId: finalRun.sourceReachFileId,
    sourceReachFileName: finalRun.sourceReachFileName,
    sourceObjectPath: finalRun.sourceObjectPath,
    summary,
    createdAt: finalRun.createdAt.toISOString(),
    updatedAt: finalRun.updatedAt.toISOString(),
  };
}
