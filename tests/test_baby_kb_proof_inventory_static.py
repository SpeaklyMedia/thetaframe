import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text()


class BabyKbProofInventoryStaticTests(unittest.TestCase):
    def test_validator_enforces_contract_boundaries(self) -> None:
        validator = read("scripts/src/babyKbProofInventory/validator.ts")
        cli = read("scripts/src/babyKbProofInventory/cli.ts")

        self.assertIn("verified_local_proof", validator)
        self.assertIn("Duplicate sourceId", validator)
        self.assertIn("Unsupported source class", validator)
        self.assertIn("Unsupported review state", validator)
        self.assertIn("Verified entries require citation metadata", validator)
        self.assertIn("Entry is marked answer-eligible", validator)
        self.assertIn("Private proof source paths must not point inside the public repository", validator)
        self.assertIn("Private root must not point inside the public repository", validator)
        self.assertIn("Safe report output must not be written inside the public repository", cli)

    def test_report_excludes_private_source_fields(self) -> None:
        validator = read("scripts/src/babyKbProofInventory/validator.ts")
        self.assertIn("SafeProofInventoryReport", validator)
        report_body = validator[validator.index("function buildSafeReport"):]
        self.assertNotIn("sourcePath:", report_body)
        self.assertNotIn("notes:", report_body)
        self.assertIn("citationLabel", report_body)

    def test_scripts_are_explicitly_local_only(self) -> None:
        package_json = read("scripts/package.json")
        plan = read("_AI_SYSTEM/BABY_KB_PROOF_INVENTORY_IMPLEMENTATION_PLAN__20260916.md")

        self.assertIn("baby-kb:proof:validate", package_json)
        self.assertIn("baby-kb:proof:report", package_json)
        self.assertIn("baby-kb:proof:test", package_json)
        self.assertIn("THETAFRAME_BABY_KB_PRIVATE_ROOT", plan)
        self.assertIn("AI/RAG answers", plan)


if __name__ == "__main__":
    unittest.main()
