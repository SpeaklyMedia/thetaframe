import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text()


def compact(value: str) -> str:
    return "".join(value.split())


class DailyRhythmV11StaticTests(unittest.TestCase):
    def test_reflection_patch_is_partial_and_no_duplicate_win(self) -> None:
        service = read("artifacts/api-server/src/lib/dailyRhythm.ts")
        component = read("artifacts/thetaframe/src/components/daily-rhythm.tsx")
        schema = read("lib/db/src/schema/daily-rhythm.ts")
        openapi = read("lib/api-spec/openapi.yaml")

        self.assertIn("patchDailyReflectionBodySchema", service)
        self.assertIn("hasOwnReflectionField", service)
        self.assertIn("buildDailyReflectionPatch", service)
        self.assertIn("onReflectionSave(patch)", service + component)
        self.assertNotIn('win: text("win")', schema)
        self.assertNotIn("win:", openapi[openapi.index("DailyReflection:"):openapi.index("DailyRhythmResponse:")])
        self.assertIn("microWinValue", component)
        self.assertIn("onMicroWinSave", component)

    def test_first_move_uses_daily_frame_field_not_time_shape(self) -> None:
        daily_schema = read("lib/db/src/schema/daily-frames.ts")
        helper = read("artifacts/thetaframe/src/lib/daily-rhythm.ts")
        daily_page = read("artifacts/thetaframe/src/pages/daily.tsx")
        openapi = read("lib/api-spec/openapi.yaml")

        self.assertIn('firstAction: text("first_action")', daily_schema)
        self.assertIn("frame?.firstAction", helper)
        self.assertIn("normalizeFirstAction", helper)
        self.assertNotIn('startTime: "09:00"', helper)
        self.assertIn("save({ firstAction: normalized })", daily_page)
        self.assertIn("firstAction:", openapi)

    def test_shutdown_completes_sleep_without_requiring_it_first(self) -> None:
        component = read("artifacts/thetaframe/src/components/daily-rhythm.tsx")
        self.assertIn('step.key !== "sleep"', component)
        self.assertIn('"sleep"', component)
        self.assertIn("nightPrerequisiteStepKeys", component)
        self.assertIn('"complete"', component)

    def test_server_side_invariants_and_real_dates_exist(self) -> None:
        service = read("artifacts/api-server/src/lib/dailyRhythm.ts")
        serialize = read("artifacts/api-server/src/lib/serialize.ts")
        route = read("artifacts/api-server/src/routes/daily-rhythm.ts")

        self.assertIn("MORNING_STEP_KEYS", service)
        self.assertIn("NIGHT_STEP_KEYS", service)
        self.assertIn("validateRoutineSessionInput", service)
        self.assertIn("Night Reset only supports full mode", service)
        self.assertIn("Unsupported routine step", service)
        self.assertIn("parsed.getUTCFullYear() === year", serialize)
        self.assertIn("DailyRhythmValidationError", route)
        self.assertIn("res.status(error.status)", route)

    def test_first_move_clear_uses_explicit_property_presence(self) -> None:
        daily_page = read("artifacts/thetaframe/src/pages/daily.tsx")
        self.assertIn('Object.prototype.hasOwnProperty.call(updates, "firstAction")', daily_page)
        self.assertIn('hasFirstActionUpdate ? updates.firstAction ?? null : normalizeFirstAction(firstAction)', daily_page)
        self.assertIn('save({ firstAction: normalized })', daily_page)
        self.assertIn('setFirstAction(normalized ?? "")', daily_page)


if __name__ == "__main__":
    unittest.main()
