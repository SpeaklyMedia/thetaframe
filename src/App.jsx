// src/App.jsx
import { useEffect, useState } from "react";
import Section from "./components/Section";
import EmojiPicker from "./components/EmojiPicker";

export default function ThetaFrame() {
  // ─── DAILY FRAME STATE ──────────────────────────────────────────────────
  const [identity, setIdentity] = useState("");
  const [top3, setTop3] = useState(["", "", ""]);
  const [micros, setMicros] = useState(["", "", ""]);
  const [reward, setReward] = useState("");
  const [reflection, setReflection] = useState("");

  // ─── WEEKLY RHYTHM STATE ───────────────────────────────────────────────
  const [weeklyTheme, setWeeklyTheme] = useState("");
  const [weeklySteps, setWeeklySteps] = useState(["", "", ""]);
  const [nonNegotiables, setNonNegotiables] = useState(["", ""]);
  const [recovery, setRecovery] = useState("");

  // ─── EMOJI STATE ───────────────────────────────────────────────────────
  const [selectedDailyEmojis, setSelectedDailyEmojis] = useState(() => {
    const s = localStorage.getItem("thetaframe-daily-emojis");
    return s ? JSON.parse(s) : {};
  });
  const [selectedWeeklyEmojis, setSelectedWeeklyEmojis] = useState(() => {
    const s = localStorage.getItem("thetaframe-weekly-emojis");
    return s ? JSON.parse(s) : {};
  });

  // ─── VIEW STATE ────────────────────────────────────────────────────────
  const [view, setView] = useState("daily");
  const [activeIndex, setActiveIndex] = useState(null);

  // ─── VISION TRACKER STATE ──────────────────────────────────────────────
  const [visionGoals, setVisionGoals] = useState(["", "", ""]);
  const [visionSteps, setVisionSteps] = useState(["", "", ""]);

  // ─── FETCH GOOGLE SHEET ─────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      const sheetId = "10apZA63eEHOz310nuDXYMxHem9DN83S5";
      const sheetName =
        view === "daily"
          ? "Daily Frame"
          : view === "weekly"
          ? "Weekly Rhythm"
          : "Vision Tracker";
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      try {
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows;

        if (view === "daily") {
          const day = new Date().toLocaleString("en-US", { weekday: "long" });
          const todayRow = rows.find((r) => r.c[0]?.v === day);
          if (todayRow) {
            setIdentity(todayRow.c[1]?.v || "");
            setTop3((todayRow.c[2]?.v || "").split("\n"));
            setMicros((todayRow.c[3]?.v || "").split("\n"));
            setReward(todayRow.c[4]?.v || "");
            setReflection(todayRow.c[5]?.v || "");
          }
        } else if (view === "weekly") {
          const weekRow = rows[1];
          if (weekRow) {
            setWeeklyTheme(weekRow.c[0]?.v || "");
            setWeeklySteps((weekRow.c[1]?.v || "").split("\n"));
            setNonNegotiables((weekRow.c[2]?.v || "").split("\n"));
            setRecovery(weekRow.c[3]?.v || "");
          }
        } else {
          const visionRow = rows[1];
          if (visionRow) {
            setVisionGoals((visionRow.c[0]?.v || "").split("\n"));
            setVisionSteps((visionRow.c[1]?.v || "").split("\n"));
          }
        }
      } catch (err) {
        console.error("Google Sheet fetch error:", err);
      } finally {
        setActiveIndex(null);
      }
    }
    fetchData();
  }, [view]);

  // ─── SYNC EMOJIS ───────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(
      "thetaframe-daily-emojis",
      JSON.stringify(selectedDailyEmojis)
    );
  }, [selectedDailyEmojis]);

  useEffect(() => {
    localStorage.setItem(
      "thetaframe-weekly-emojis",
      JSON.stringify(selectedWeeklyEmojis)
    );
  }, [selectedWeeklyEmojis]);

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="thetaframe-app p-4">
      {/* Tab buttons */}
      <nav className="mb-4">
        {["daily", "weekly", "vision"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`mr-2 px-3 py-1 rounded ${
              view === v ? "font-bold underline" : "opacity-75"
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </nav>

      {/* Daily */}
      {view === "daily" && (
        <Section label="Daily Frame">
          <div className="space-y-6">
            {/* Identity */}
            <div>
              <label>Identity:</label>
              <input
                className="block w-full mt-1"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
              />
              <EmojiPicker
                label="Mood:"
                emojis={["✨", "🌅", "💫"]}
                selected={selectedDailyEmojis.identity}
                onSelect={(emo) =>
                  setSelectedDailyEmojis((prev) => ({ ...prev, identity: emo }))
                }
              />
            </div>

            {/* Top 3 */}
            <div>
              <label>Top 3:</label>
              {top3.map((t, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={t}
                  onChange={(e) => {
                    const c = [...top3];
                    c[i] = e.target.value;
                    setTop3(c);
                  }}
                />
              ))}
              <EmojiPicker
                label="Priority Vibe:"
                emojis={["🎯", "✅", "🔝"]}
                selected={selectedDailyEmojis.top3}
                onSelect={(emo) =>
                  setSelectedDailyEmojis((prev) => ({ ...prev, top3: emo }))
                }
              />
            </div>

            {/* Micros */}
            <div>
              <label>Micros:</label>
              {micros.map((m, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={m}
                  onChange={(e) => {
                    const c = [...micros];
                    c[i] = e.target.value;
                    setMicros(c);
                  }}
                />
              ))}
              <EmojiPicker
                label="Micro Vibe:"
                emojis={["⚙️", "🐜", "🏃"]}
                selected={selectedDailyEmojis.micros}
                onSelect={(emo) =>
                  setSelectedDailyEmojis((prev) => ({ ...prev, micros: emo }))
                }
              />
            </div>

            {/* Reward */}
            <div>
              <label>Reward:</label>
              <input
                className="block w-full mt-1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
              />
              <EmojiPicker
                label="Reward Vibe:"
                emojis={["🏆", "🎁", "🍫"]}
                selected={selectedDailyEmojis.reward}
                onSelect={(emo) =>
                  setSelectedDailyEmojis((prev) => ({ ...prev, reward: emo }))
                }
              />
            </div>

            {/* Reflection */}
            <div>
              <label>Reflection:</label>
              <textarea
                className="block w-full mt-1"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
              <EmojiPicker
                label="Reflection Vibe:"
                emojis={["🤔", "📝", "🌙"]}
                selected={selectedDailyEmojis.reflection}
                onSelect={(emo) =>
                  setSelectedDailyEmojis((prev) => ({ ...prev, reflection: emo }))
                }
              />
            </div>
          </div>
        </Section>
      )}

      {/* Weekly */}
      {view === "weekly" && (
        <Section label="Weekly Rhythm">
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label>Theme:</label>
              <input
                className="block w-full mt-1"
                value={weeklyTheme}
                onChange={(e) => setWeeklyTheme(e.target.value)}
              />
              <EmojiPicker
                label="Theme Mood:"
                emojis={["🗓️", "🔮", "🧭"]}
                selected={selectedWeeklyEmojis.theme}
                onSelect={(emo) =>
                  setSelectedWeeklyEmojis((prev) => ({ ...prev, theme: emo }))
                }
              />
            </div>

            {/* Key Steps */}
            <div>
              <label>Key Steps:</label>
              {weeklySteps.map((s, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={s}
                  onChange={(e) => {
                    const c = [...weeklySteps];
                    c[i] = e.target.value;
                    setWeeklySteps(c);
                  }}
                />
              ))}
              <EmojiPicker
                label="Steps Mood:"
                emojis={["👣", "🪜", "➡️"]}
                selected={selectedWeeklyEmojis.steps}
                onSelect={(emo) =>
                  setSelectedWeeklyEmojis((prev) => ({ ...prev, steps: emo }))
                }
              />
            </div>

            {/* Non-negotiables */}
            <div>
              <label>Non-negotiables:</label>
              {nonNegotiables.map((n, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={n}
                  onChange={(e) => {
                    const c = [...nonNegotiables];
                    c[i] = e.target.value;
                    setNonNegotiables(c);
                  }}
                />
              ))}
              <EmojiPicker
                label="Non-neg Mood:"
                emojis={["🛡️", "🚫", "🤝"]}
                selected={selectedWeeklyEmojis.nonNegotiables}
                onSelect={(emo) =>
                  setSelectedWeeklyEmojis((prev) => ({ ...prev, nonNegotiables: emo }))
                }
              />
            </div>

            {/* Recovery */}
            <div>
              <label>Recovery:</label>
              <input
                className="block w-full mt-1"
                value={recovery}
                onChange={(e) => setRecovery(e.target.value)}
              />
              <EmojiPicker
                label="Recovery Mood:"
                emojis={["😴", "🛁", "🧘"]}
                selected={selectedWeeklyEmojis.recovery}
                onSelect={(emo) =>
                  setSelectedWeeklyEmojis((prev) => ({ ...prev, recovery: emo }))
                }
              />
            </div>
          </div>
        </Section>
      )}

      {/* Vision */}
      {view === "vision" && (
        <Section label="Vision Tracker">
          <div className="space-y-6">
            {/* Goals */}
            <div>
              <label>Goals:</label>
              {visionGoals.map((g, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={g}
                  onChange={(e) => {
                    const c = [...visionGoals];
                    c[i] = e.target.value; setVisionGoals(c);
                  }}
                />
              ))}  
            </div>

            {/* Action Steps */}
            <div>
              <label>Action Steps:</label>
              {visionSteps.map((s, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={s}
                  onChange={(e) => {
                    const c = [...visionSteps];
                    c[i] = e.target.value; setVisionSteps(c);
                  }}
                />
              ))}  
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}