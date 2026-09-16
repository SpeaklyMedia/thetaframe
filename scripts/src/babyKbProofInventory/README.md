# Baby-KB Proof Inventory Scripts

Local-only tooling for validating and reporting on a private Baby-KB proof inventory.

## Boundary

These scripts do not ingest documents, parse PDFs, generate embeddings, call AI, create database tables, or expose a browser UI.

They validate fake fixtures in-repo and can validate a user-selected private root outside the repository.

## Commands

```bash
pnpm --filter @workspace/scripts run baby-kb:proof:test
pnpm --filter @workspace/scripts run baby-kb:proof:validate -- --root "$THETAFRAME_BABY_KB_PRIVATE_ROOT"
pnpm --filter @workspace/scripts run baby-kb:proof:report -- --root "$THETAFRAME_BABY_KB_PRIVATE_ROOT" --out /tmp/baby-kb-proof-report.json
```

`--root` or `THETAFRAME_BABY_KB_PRIVATE_ROOT` must point outside the public repository.

The report command refuses to write output inside the repository by default.

## Private Data Rules

Do not commit:

- private proof documents
- real baby/caregiver source material
- generated chunks or embeddings
- local proof inventory files
- auth state, cookies, Clerk keys, Vercel env files, or database URLs
