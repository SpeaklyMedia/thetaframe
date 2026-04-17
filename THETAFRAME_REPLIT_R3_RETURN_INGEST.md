# ThetaFrame Replit R3 Return Ingest

Date: 2026-04-14

## Source Bundle
- `/home/mark/Downloads/thetaframe-R3-2026-04-14-BUNDLE.zip`

## Repo-Ingested Copy
- `artifacts/replit-r3-return/thetaframe-R3-2026-04-14-BUNDLE.zip`

## Extracted Locations
- Outer bundle extract:
  - `artifacts/replit-r3-return/extracted/thetaframe-R3-2026-04-14-BUNDLE/`
- Returned portable artifact zip:
  - `artifacts/replit-r3-return/extracted/thetaframe-R3-2026-04-14-BUNDLE/artifact/thetaframe-R3-2026-04-14.zip`
- Returned portable artifact extracted:
  - `artifacts/replit-r3-return/artifact/`

## Integrity
- Outer bundle SHA-256:
  - `ee05e1f359591fa59b349bb37ee38941a3a0d348411f9519027bb651f43b8501`
- Extracted portable artifact SHA-256:
  - `eb9eafbd47ed4f1a8f1bd8bf568ac5923c44228580e8bfd73bd3bedbe42fd4a2`
- The repo-ingested outer bundle matches the Downloads source byte-for-byte.

## Returned Receipts Present
- `R3-build-receipt.md`
- `R3-changed-files.md`
- `R3-patch-notes.md`
- `R3-assumptions-deviations.md`
- `R3-codex-handoff.md`
- `brand-asset-notes.md`
- screenshot set:
  - `screenshot-signed-out.jpg`
  - `screenshot-daily-desktop.jpg`
  - `screenshot-daily-mobile.jpg`
  - `screenshot-weekly-desktop.jpg`
  - `screenshot-vision-desktop.jpg`

All of the above are available under:
- `artifacts/replit-r3-return/extracted/thetaframe-R3-2026-04-14-BUNDLE/receipts/`

## Returned Artifact Shape
- The returned portable artifact expands into a partial repo tree under:
  - `artifacts/replit-r3-return/artifact/artifacts/thetaframe/`
- The extracted artifact currently contains 88 files.
- The claimed R3 frontend files are present in the returned artifact, including:
  - `artifacts/thetaframe/src/App.tsx`
  - `artifacts/thetaframe/src/components/header.tsx`
  - `artifacts/thetaframe/src/components/shell/ThetaFrameStartup.tsx`
  - `artifacts/thetaframe/src/pages/sign-in.tsx`
  - `artifacts/thetaframe/src/pages/daily.tsx`
  - `artifacts/thetaframe/src/pages/weekly.tsx`
  - `artifacts/thetaframe/src/pages/vision.tsx`
  - `artifacts/thetaframe/src/pages/bizdev.tsx`
  - `artifacts/thetaframe/src/pages/life-ledger.tsx`
  - `artifacts/thetaframe/src/pages/reach.tsx`
  - `artifacts/thetaframe/src/pages/admin.tsx`

## Intake Findings
- This bundle is structurally usable for Codex-side review and transport work.
- The returned changed-file receipt uses canonical repo-root paths for the modified frontend files.
- The returned bundle does not appear to include explicit commit SHA / merge SHA proof.
- The returned bundle does not appear to include exact build command transcripts; the build receipt is checklist-style rather than raw command output.
- The returned screenshots and receipts are present, but there is no separate screenshot manifest file.

## Recommended Next Step
- Use this ingest as the intake source for changed-file review against canonical repo state before any transport or merge decisions.
