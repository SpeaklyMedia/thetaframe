// src/App.jsx
import React, { useEffect, useState } from "react";
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

  // ─── VISION TRACKER STATE ──────────────────────────────────────────────
  const [visionGoals, setVisionGoals] = useState(["", "", ""]);
  const [visionSteps, setVisionSteps] = useState(["", "", ""]);

  // ─── EMOJI STATE ───────────────────────────────────────────────────────
  const [selectedDailyEmojis, setSelectedDailyEmojis] = useState(() => {
    const saved = localStorage.getItem("thetaframe-daily-emojis");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedWeeklyEmojis, setSelectedWeeklyEmojis] = useState(() => {
    const saved = localStorage.getItem("thetaframe-weekly-emojis");
    return saved ? JSON.parse(saved) : {};
  });

  // ─── VIEW STATE ────────────────────────────────────────────────────────
  const [view, setView] = useState("daily");

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
        const data = JSON.parse(text.substring(47).slice(0, -2));
        const rows = data.table.rows;

        if (view === "daily") {
          const day = new Date().toLocaleString("en-US", { weekday: "long" });
          const today = rows.find((r) => r.c[0]?.v === day);
          if (today) {
            setIdentity(today.c[1]?.v || "");
            setTop3((today.c[2]?.v || "").split("\n"));
            setMicros((today.c[3]?.v || "").split("\n"));
            setReward(today.c[4]?.v || "");
            setReflection(today.c[5]?.v || "");
          }
        } else if (view === "weekly") {
          const row = rows[1];
          if (row) {
            setWeeklyTheme(row.c[0]?.v || "");
            setWeeklySteps((row.c[1]?.v || "").split("\n"));
            setNonNegotiables((row.c[2]?.v || "").split("\n"));
            setRecovery(row.c[3]?.v || "");
          }
        } else {
          const row = rows[1];
          if (row) {
            setVisionGoals((row.c[0]?.v || "").split("\n"));
            setVisionSteps((row.c[1]?.v || "").split("\n"));
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }
    fetchData();
  }, [view]);

  // ─── PERSIST EMOJIS ─────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto max-w-3xl p-4">
        {/* Navigation Tabs */}
        <nav className="mb-8 flex space-x-4">
          {['daily', 'weekly', 'vision'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded ${
                view === v
                  ? 'font-bold underline text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>

        {/* Daily View */}
        {view === 'daily' && (
          <Section label="Daily Frame">
            <div className="space-y-6">
              {/* Identity */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Identity:</label>
                <input
                  className="border rounded p-2 w-full"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Top 3:</label>
                {top3.map((t, i) => (
                  <input
                    key={i}
                    className="border rounded p-2 w-full mb-1"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Micros:</label>
                {micros.map((m, i) => (
                  <input
                    key={i}
                    className="border rounded p-2 w-full mb-1"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Reward:</label>
                <input
                  className="border rounded p-2 w-full"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Reflection:</label>
                <textarea
                  className="border rounded p-2 w-full"
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

        {/* Weekly View */}
        {view === 'weekly' && (
          <Section label="Weekly Rhythm">
            <div className="space-y-6">
              {/* Theme */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Theme:</label>
                <input
                  className="border rounded p-2 w-full"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Key Steps:</label>
                {weeklySteps.map((s, i) => (
                  <input
                    key={i}
                    className="border rounded p-2 w-full mb-1"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Non-negotiables:</label>
                {nonNegotiables.map((n, i) => (
                  <input
                    key={i}
                    className="border rounded p-2 w-full mb-1"
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
              <div className="flex flex-col">
                <label className="font-medium mb-1">Recovery:</label>
                <input
                  className="border rounded p-2 w-full"
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

        {/* Vision View */}
        {view === 'vision' && (
          <Section label="Vision Tracker">
            <div className="space-y-6">
              {/* Goals */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Goals:</label>
                {visionGoals.map((g, i) => (
                  <input
                    key={i}
                    className="border rounded p-2 w-full mb-1"
                    value={g}
                    onChange={(e) => {
                      const c = [...visionGoals];
                      c[i] = e.target.value;
                      setVisionGoals(c);
                    }}
                  />
                ))}
              </div>

              {/* Action Steps */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Action Steps:</label>
                {visionSteps.map((s, i) => (
                  <input
                    key={i}
                    className="border rounded p-2 w-full mb-1"
                    value={s}
                    onChange={(e) => {
                      const c = [...visionSteps];
                      c[i] = e.target.value;
                      setVisionSteps(c);
                    }}
                  />
                ))}
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}