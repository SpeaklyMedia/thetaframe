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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─── VIEW STATE ────────────────────────────────────────────────────────
  const [view, setView] = useState("daily");

  // ─── FETCH GOOGLE SHEET ─────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
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
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Unable to load data. Check your connection and try again.");
        setLoading(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="app-container">
        {/* Navigation Tabs */}
        <nav className="mb-6 flex flex-wrap gap-2 sticky top-0 z-10 bg-slate-50/90 py-3 backdrop-blur">
          {['daily', 'weekly', 'vision'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`app-chip ${view === v ? "app-chip-active" : ""}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>

        {loading && (
          <div className="mb-4 text-sm text-slate-500">Loading data…</div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Daily View */}
        {view === 'daily' && (
          <Section label="Daily Frame">
            <div className="space-y-6">
              {/* Identity */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-slate-700">Identity:</label>
                <input
                  className="app-input"
                  placeholder="Describe today's identity"
                  aria-label="Identity"
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
                <label className="mb-1 text-sm font-medium text-slate-700">Top 3:</label>
                {top3.map((t, i) => (
                  <input
                    key={i}
                    className="app-input mb-1"
                    placeholder={`Top priority ${i + 1}`}
                    aria-label={`Top priority ${i + 1}`}
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
                <label className="mb-1 text-sm font-medium text-slate-700">Micros:</label>
                {micros.map((m, i) => (
                  <input
                    key={i}
                    className="app-input mb-1"
                    placeholder={`Micro action ${i + 1}`}
                    aria-label={`Micro action ${i + 1}`}
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
                <label className="mb-1 text-sm font-medium text-slate-700">Reward:</label>
                <input
                  className="app-input"
                  placeholder="Reward yourself"
                  aria-label="Reward"
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
                <label className="mb-1 text-sm font-medium text-slate-700">Reflection:</label>
                <textarea
                  className="app-input app-textarea"
                  rows={3}
                  placeholder="Quick reflection"
                  aria-label="Reflection"
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
                <label className="mb-1 text-sm font-medium text-slate-700">Theme:</label>
                <input
                  className="app-input"
                  placeholder="Weekly theme"
                  aria-label="Weekly theme"
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
                <label className="mb-1 text-sm font-medium text-slate-700">Key Steps:</label>
                {weeklySteps.map((s, i) => (
                  <input
                    key={i}
                    className="app-input mb-1"
                    placeholder={`Key step ${i + 1}`}
                    aria-label={`Key step ${i + 1}`}
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
                <label className="mb-1 text-sm font-medium text-slate-700">Non-negotiables:</label>
                {nonNegotiables.map((n, i) => (
                  <input
                    key={i}
                    className="app-input mb-1"
                    placeholder={`Non-negotiable ${i + 1}`}
                    aria-label={`Non-negotiable ${i + 1}`}
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
                <label className="mb-1 text-sm font-medium text-slate-700">Recovery:</label>
                <input
                  className="app-input"
                  placeholder="Recovery focus"
                  aria-label="Recovery"
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
                <label className="mb-1 text-sm font-medium text-slate-700">Goals:</label>
                {visionGoals.map((g, i) => (
                  <input
                    key={i}
                    className="app-input mb-1"
                    placeholder={`Vision goal ${i + 1}`}
                    aria-label={`Vision goal ${i + 1}`}
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
                <label className="mb-1 text-sm font-medium text-slate-700">Action Steps:</label>
                {visionSteps.map((s, i) => (
                  <input
                    key={i}
                    className="app-input mb-1"
                    placeholder={`Action step ${i + 1}`}
                    aria-label={`Action step ${i + 1}`}
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
