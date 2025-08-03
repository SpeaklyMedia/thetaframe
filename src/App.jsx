// ─── IMPORTS ───────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import Section from "./components/Section";

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
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

  // ─── EMOJI SELECTION STATE ─────────────────────────────────────────────
  const [selectedDailyEmojis, setSelectedDailyEmojis] = useState(() => {
    const stored = localStorage.getItem("thetaframe-daily-emojis");
    return stored ? JSON.parse(stored) : {};
  });
  const [selectedWeeklyEmojis, setSelectedWeeklyEmojis] = useState(() => {
    const stored = localStorage.getItem("thetaframe-weekly-emojis");
    return stored ? JSON.parse(stored) : {};
  });

  // ─── VIEW STATE ────────────────────────────────────────────────────────
  const [view, setView] = useState("daily");
  const [activeIndex, setActiveIndex] = useState(null);

  // ─── VISION TRACKER STATE ──────────────────────────────────────────────
  const [visionGoals, setVisionGoals] = useState(["", "", ""]);
  const [visionSteps, setVisionSteps] = useState(["", "", ""]);

  // ─── FETCH DATA FROM GOOGLE SHEETS ─────────────────────────────────────
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
        } else if (view === "vision") {
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

  // ─── PERSIST EMOJIS ────────────────────────────────────────────────────
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
      {/* View Switcher */}
      <nav className="mb-4">
        {['daily', 'weekly', 'vision'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`mr-2 px-3 py-1 rounded ${
              view === v ? 'font-bold underline' : 'opacity-75'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </nav>

      {/* Daily Frame */}
      {view === 'daily' && (
        <Section title="Daily Frame">
          <div className="space-y-3">
            <div>
              <label>Identity:</label>
              <input
                className="block w-full mt-1"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
              />
            </div>

            <div>
              <label>Top 3:</label>
              {top3.map((t, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={t}
                  onChange={(e) =>
                    setTop3((arr) => {
                      const copy = [...arr];
                      copy[i] = e.target.value;
                      return copy;
                    })
                  }
                />
              ))}
            </div>

            <div>
              <label>Micros:</label>
              {micros.map((m, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={m}
                  onChange={(e) =>
                    setMicros((arr) => {
                      const copy = [...arr];
                      copy[i] = e.target.value;
                      return copy;
                    })
                  }
                />
              ))}
            </div>

            <div>
              <label>Reward:</label>
              <input
                className="block w-full mt-1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
              />
            </div>

            <div>
              <label>Reflection:</label>
              <textarea
                className="block w-full mt-1"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Weekly Rhythm */}
      {view === 'weekly' && (
        <Section title="Weekly Rhythm">
          <div className="space-y-3">
            <div>
              <label>Theme:</label>
              <input
                className="block w-full mt-1"
                value={weeklyTheme}
                onChange={(e) => setWeeklyTheme(e.target.value)}
              />
            </div>

            <div>
              <label>Key Steps:</label>
              {weeklySteps.map((s, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={s}
                  onChange={(e) =>
                    setWeeklySteps((arr) => {
                      const copy = [...arr];
                      copy[i] = e.target.value;
                      return copy;
                    })
                  }
                />
              ))}
            </div>

            <div>
              <label>Non-negotiables:</label>
              {nonNegotiables.map((n, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={n}
                  onChange={(e) =>
                    setNonNegotiables((arr) => {
                      const copy = [...arr];
                      copy[i] = e.target.value;
                      return copy;
                    })
                  }
                />
              ))}
            </div>

            <div>
              <label>Recovery:</label>
              <input
                className="block w-full mt-1"
                value={recovery}
                onChange={(e) => setRecovery(e.target.value)}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Vision Tracker */}
      {view === 'vision' && (
        <Section title="Vision Tracker">
          <div className="space-y-3">
            <div>
              <label>Goals:</label>
              {visionGoals.map((g, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={g}
                  onChange={(e) =>
                    setVisionGoals((arr) => {
                      const copy = [...arr];
                      copy[i] = e.target.value;
                      return copy;
                    })
                  }
                />
              ))}
            </div>

            <div>
              <label>Action Steps:</label>
              {visionSteps.map((s, i) => (
                <input
                  key={i}
                  className="block w-full mt-1"
                  value={s}
                  onChange={(e) =>
                    setVisionSteps((arr) => {
                      const copy = [...arr];
                      copy[i] = e.target.value;
                      return copy;
                    })
                  }
                />
              ))}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}