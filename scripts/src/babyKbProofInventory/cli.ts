import fs from "node:fs";
import path from "node:path";
import { validatePrivateRoot, validateProofInventory } from "./validator.js";

export interface ParsedArgs {
  root?: string;
  inventory?: string;
  out?: string;
  repoRoot: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { repoRoot: process.cwd() };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--root" && next) {
      args.root = next;
      index += 1;
    } else if (arg === "--inventory" && next) {
      args.inventory = next;
      index += 1;
    } else if (arg === "--out" && next) {
      args.out = next;
      index += 1;
    } else if (arg === "--repo-root" && next) {
      args.repoRoot = next;
      index += 1;
    } else {
      throw new Error(`Unsupported or incomplete argument: ${arg}`);
    }
  }

  return args;
}

export function defaultInventoryPath(root: string): string {
  return path.join(root, "inventory", "proof-inventory.json");
}

export function readInventoryJson(inventoryPath: string): unknown {
  return JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
}

export function pathIsInside(parentPath: string, candidatePath: string): boolean {
  const resolvedParent = path.resolve(parentPath);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(resolvedParent, resolvedCandidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function runValidate(args: ParsedArgs): number {
  if (!args.root) {
    console.error("THETAFRAME_BABY_KB_PRIVATE_ROOT or --root is required");
    return 1;
  }

  const privateRootErrors = validatePrivateRoot(args.root, args.repoRoot);
  if (privateRootErrors.length > 0) {
    for (const error of privateRootErrors) console.error(error.message);
    return 1;
  }

  const inventoryPath = args.inventory ?? defaultInventoryPath(args.root);
  const inventory = readInventoryJson(inventoryPath);
  const result = validateProofInventory(inventory, { repoRoot: args.repoRoot, privateRoot: args.root });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        privateRootClass: "local_private",
        summary: result.summary,
        errorCount: result.errors.length,
        errors: result.errors,
      },
      null,
      2,
    ),
  );

  return result.ok ? 0 : 1;
}

export function runReport(args: ParsedArgs): number {
  if (!args.root) {
    console.error("THETAFRAME_BABY_KB_PRIVATE_ROOT or --root is required");
    return 1;
  }

  const privateRootErrors = validatePrivateRoot(args.root, args.repoRoot);
  if (privateRootErrors.length > 0) {
    for (const error of privateRootErrors) console.error(error.message);
    return 1;
  }

  if (!args.out) {
    console.error("--out is required for safe report output");
    return 1;
  }

  if (pathIsInside(args.repoRoot, args.out)) {
    console.error("Safe report output must not be written inside the public repository");
    return 1;
  }

  const inventoryPath = args.inventory ?? defaultInventoryPath(args.root);
  const inventory = readInventoryJson(inventoryPath);
  const result = validateProofInventory(inventory, { repoRoot: args.repoRoot, privateRoot: args.root });

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(result.report, null, 2)}\n`);

  if (!result.ok) {
    console.error(`Inventory validation failed; safe report written with ${result.errors.length} error(s).`);
    return 1;
  }

  console.log("Safe proof inventory report written.");
  return 0;
}
