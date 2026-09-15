import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text()


def compact(value: str) -> str:
    return "".join(value.split())


class DailyRhythmV1StaticTests(unittest.TestCase):
    def test_morning_and_night_sequences_are_preserved(self) -> None:
        text = read("artifacts/thetaframe/src/lib/daily-rhythm.ts")
        morning_icons = ["💧", "🌤️", "👟", "🛡️", "🏠", "🌳", "🧭"]
        night_icons = ["📥", "📓", "🎯", "🧺", "🌙"]
        self.assertEqual(
            [text.index(f'icon: "{icon}"') for icon in morning_icons],
            sorted(text.index(f'icon: "{icon}"') for icon in morning_icons),
        )
        self.assertEqual(
            [text.index(f'icon: "{icon}"') for icon in night_icons],
            sorted(text.index(f'icon: "{icon}"') for icon in night_icons),
        )
        self.assertIn('minimum: ["hydrate", "center", "command"]', text)
        self.assertIn("Short and Minimum are valid", read("artifacts/thetaframe/src/components/daily-rhythm.tsx"))

    def test_persistence_is_additive_and_user_scoped(self) -> None:
        schema = read("lib/db/src/schema/daily-rhythm.ts")
        self.assertIn('pgTable("routine_sessions"', compact(schema))
        self.assertIn('pgTable("daily_reflections"', compact(schema))
        self.assertIn('userId: text("user_id").notNull()', schema)
        self.assertIn('uniqueIndex("routine_sessions_user_date_key_idx").on(table.userId,table.date,table.routineKey', compact(schema))
        self.assertIn('uniqueIndex("daily_reflections_user_date_idx").on(table.userId, table.date)', schema)
        service = read("artifacts/api-server/src/lib/dailyRhythm.ts")
        self.assertIn("eq(routineSessionsTable.userId, userId)", service)
        self.assertIn("eq(dailyReflectionsTable.userId, userId)", service)

    def test_routes_are_authenticated_and_daily_module_scoped(self) -> None:
        route = read("artifacts/api-server/src/routes/daily-rhythm.ts")
        self.assertIn('router.use("/daily-rhythm", requireAuth, requireModuleAccess("daily"));', route)
        self.assertIn('router.get("/daily-rhythm/:date"', compact(route))
        self.assertIn('router.put("/daily-rhythm/:date/routine-sessions/:routineKey"', compact(route))
        self.assertIn('router.put("/daily-rhythm/:date/reflection"', compact(route))

    def test_dashboard_remains_canonical_and_daily_owns_full_workflow(self) -> None:
        app = read("artifacts/thetaframe/src/App.tsx")
        daily = read("artifacts/thetaframe/src/pages/daily.tsx")
        dashboard = read("artifacts/thetaframe/src/pages/dashboard.tsx")
        self.assertIn('<Route path="/dashboard">', app)
        self.assertIn('<DashboardRoute />', app)
        self.assertIn('<Route path="/daily">', app)
        self.assertIn('<ModuleRoute component={DailyPage} module="daily" />', app)
        self.assertIn('isError ? "/daily" : "/dashboard"', app)
        self.assertIn("MorningRhythmPanel", daily)
        self.assertIn("NightResetPanel", daily)
        self.assertIn("dashboard-today-rhythm", dashboard)
        self.assertNotIn("<MorningRhythmPanel", dashboard)
        self.assertNotIn("<NightResetPanel", dashboard)


if __name__ == "__main__":
    unittest.main()
