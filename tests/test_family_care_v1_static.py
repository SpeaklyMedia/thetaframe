import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text()


class FamilyCareV1StaticTests(unittest.TestCase):
    def test_schema_is_additive_and_separate(self) -> None:
        schema = read("lib/db/src/schema/family-care.ts")
        self.assertIn('"family_care_contexts"', schema)
        self.assertIn('"family_care_events"', schema)
        self.assertIn('"family_care_event_revisions"', schema)
        self.assertIn('"family_care_handoffs"', schema)
        self.assertIn('uniqueIndex("family_care_events_user_client_idx")', schema)
        self.assertNotIn("dailyFramesTable", schema)
        self.assertNotIn("lifeLedger", schema)

    def test_routes_are_authenticated_and_module_gated(self) -> None:
        route = read("artifacts/api-server/src/routes/family-care.ts")
        self.assertIn('router.use("/family-care", requireAuth, requireModuleAccess("daily"))', route)
        self.assertIn('router.get("/family-care"', route)
        self.assertIn('router.post("/family-care/events"', route)
        self.assertIn('router.delete("/family-care/events/:eventId"', route)

    def test_every_private_event_mutation_is_owner_scoped(self) -> None:
        service = read("artifacts/api-server/src/lib/familyCare.ts")
        self.assertGreaterEqual(service.count("eq(familyCareEventsTable.userId"), 5)
        self.assertIn("requireOwnedEvent(tx, args.userId, args.eventId)", service)
        self.assertIn("requireOwnedEvent(tx, userId, eventId)", service)
        self.assertIn("familyCareEventRevisionsTable", service)
        self.assertIn("onConflictDoNothing", service)

    def test_server_validates_observation_semantics(self) -> None:
        service = read("artifacts/api-server/src/lib/familyCare.ts")
        for evidence in (
            "Nursing volume must remain unknown",
            "Consumed volume cannot exceed offered volume",
            "Select wet and/or stool",
            "Sleep end must be after sleep start",
            "Sleep end cannot be in the future",
            "Observed time cannot be in the future",
            'sourceClass: text("source_class").notNull().default("caregiver_observation")',
        ):
            self.assertIn(evidence, service + read("lib/db/src/schema/family-care.ts"))

    def test_migration_has_checks_and_explicit_rollback(self) -> None:
        migration = read("lib/db/migrations/0001_family_care_v1.sql")
        rollback = read("lib/db/migrations/0001_family_care_v1.rollback.sql")
        self.assertIn("CHECK (kind IN ('feed', 'diaper', 'sleep', 'pump', 'note'))", migration)
        self.assertIn("CHECK (ended_at IS NULL OR ended_at > observed_at)", migration)
        self.assertIn("CHECK (source_class = 'caregiver_observation')", migration)
        self.assertIn("DROP TABLE IF EXISTS family_care_events", rollback)

    def test_frontend_is_native_protected_and_not_local_storage(self) -> None:
        app = read("artifacts/thetaframe/src/App.tsx")
        page = read("artifacts/thetaframe/src/pages/family-care.tsx")
        dashboard = read("artifacts/thetaframe/src/pages/dashboard.tsx")
        self.assertIn('<Route path="/family-care">', app)
        self.assertIn('module="daily"', app[app.index('<Route path="/family-care">'):])
        self.assertIn('href="/family-care"', dashboard)
        self.assertNotIn("localStorage", page)
        self.assertIn("Shared household access is not enabled yet", page)
        self.assertIn("Planned, not observed sleep", page)
        self.assertIn("Feeding markers are examples", page)
        self.assertIn("clientEventId: eventForm.clientEventId", page)
        self.assertIn("Observation date/time fields follow this device's timezone", page)

    def test_transport_artifacts_are_absent_from_feature_source(self) -> None:
        paths = [
            "lib/db/src/schema/family-care.ts",
            "artifacts/api-server/src/lib/familyCare.ts",
            "artifacts/api-server/src/routes/family-care.ts",
            "artifacts/thetaframe/src/lib/family-care.ts",
            "artifacts/thetaframe/src/pages/family-care.tsx",
            "_AI_SYSTEM/FAMILY_CARE_V1_CONTRACT__20261105.md",
        ]
        text = "\n".join(read(path) for path in paths).lower()
        for forbidden in (".eml", ".mbox", "raw_message", "mailbox_export"):
            self.assertNotIn(forbidden, text)

    def test_openapi_contract_and_generated_clients_exist(self) -> None:
        spec = read("lib/api-spec/openapi.yaml")
        generated = read("lib/api-client-react/src/generated/api.ts")
        self.assertIn("/family-care:", spec)
        self.assertIn("/family-care/events/{eventId}:", spec)
        create_schema = spec[spec.index("    CreateFamilyCareEventBody:"):spec.index("    UpdateFamilyCareEventBody:")]
        self.assertIn("additionalProperties: false", create_schema)
        self.assertNotIn("allOf:", create_schema)
        self.assertIn("useGetFamilyCare", generated)
        self.assertIn("useDeleteFamilyCareEvent", generated)


if __name__ == "__main__":
    unittest.main()
