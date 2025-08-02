import { useEffect, useState } from "react";
import Section from "./components/Section";

export default function ThetaFrame() {
  const [identity, setIdentity] = useState("");
  const [top3, setTop3] = useState(["", "", ""]);
  const [micros, setMicros] = useState(["", "", ""]);
  const [reward, setReward] = useState("");
  const [reflection, setReflection] = useState("");
  const [weeklyTheme, setWeeklyTheme] = useState("");
  const [weeklySteps, setWeeklySteps] = useState(["", "", ""]);
  const [nonNegotiables, setNonNegotiables] = useState(["", ""]);
  const [recovery, setRecovery] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedDailyEmojis, setSelectedDailyEmojis] = useState(() => {
    const stored = localStorage.getItem("thetaframe-daily-emojis");
    return stored ? JSON.parse(stored) : {};
  });
  const [selectedWeeklyEmojis, setSelectedWeeklyEmojis] = useState(() => {
    const stored = localStorage.getItem("thetaframe-weekly-emojis");
    return stored ? JSON.parse(stored) : {};
  });
  const [view, setView] = useState("daily");
  const [visionGoals, setVisionGoals] = useState(["", "", ""]);
  const [visionSteps, setVisionSteps] = useState(["", "", ""]);

  useEffect(() => {
    async function fetchData() {
      const sheetId = "10apZA63eEHOz310nuDXYMxHem9DN83S5";
      const sheetName = view === "daily" ? "Daily Frame" : view === "weekly" ? "Weekly Rhythm" : "Vision Tracker";
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      try {
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows;
        const day = new Date().toLocaleString("en-US", { weekday: "long" });

        if (view === "daily") {
          const todayRow = rows.find(row => row.c[0]?.v === day);
          if (todayRow) {
            setIdentity(todayRow.c[1]?.v || "");
            setTop3((todayRow.c[2]?.v || "").split("\n"));
            setMicros((todayRow.c[3]?.v || "").split("\n"));
            setReward(todayRow.c[4]?.v || "");
            setReflection(todayRow.c[5]?.v || "");
          }
        } else if (view === "weekly") {
          const weekRow = rows.find(row => row.c[0]?.v === "This Week");
          if (weekRow) {
            setWeeklyTheme(weekRow.c[1]?.v || "");
            setWeeklySteps((weekRow.c[2]?.v || "").split("\n"));
            setNonNegotiables((weekRow.c[3]?.v || "").split("\n"));
            setRecovery(weekRow.c[4]?.v || "");
          }
        } else if (view === "vision") {
          const visionRow = rows.find(row => row.c[0]?.v === "Vision" || row.c[0]?.v === "1");
          if (visionRow) {
            setVisionGoals((visionRow.c[1]?.v || "").split("\n"));
            setVisionSteps((visionRow.c[2]?.v || "").split("\n"));
          }
        }
      } catch (err) {
        console.error("Google Sheet fetch error:", err);
      }
    }

    fetchData();
  }, [view]);

  useEffect(() => {
    localStorage.setItem("thetaframe-daily-emojis", JSON.stringify(selectedDailyEmojis));
  }, [selectedDailyEmojis]);

  useEffect(() => {
    localStorage.setItem("thetaframe-weekly-emojis", JSON.stringify(selectedWeeklyEmojis));
  }, [selectedWeeklyEmojis]);

  const handleListChange = (listSetter, index, value) => {
    const updated = [...listSetter];
    updated[index] = value;
    listSetter(updated);
  };

  const renderEditableList = (items, setItems, sectionKey) => {
    const emojiOptions = ["💡", "🔥", "🎯", "💪", "📈", "📸", "🎵", "🌱", "📦", "🧠"];
    const isDaily = view === "daily";
    const emojisState = isDaily ? selectedDailyEmojis : selectedWeeklyEmojis;
    const setEmojisState = isDaily ? setSelectedDailyEmojis : setSelectedWeeklyEmojis;

    const handleEmojiClick = (index, emoji) => {
      const key = `${sectionKey}-${index}`;
      const currentEmojis = emojisState[key] || [];
      let newEmojis;
      if (currentEmojis.length === 0) {
        newEmojis = [emoji];
      } else if (currentEmojis.length === 1) {
        newEmojis = [currentEmojis[0], emoji];
      } else {
        newEmojis = [emoji];
      }
      setEmojisState({ ...emojisState, [key]: newEmojis });
    };

    return (
      <div className="grid gap-3">
        {items.map((item, i) => {
          const key = `${sectionKey}-${i}`;
          const emojis = emojisState[key] || [];
          const emojiDisplay = emojis.length === 2 ? `${emojis[0]} → ${emojis[1]}` : emojis[0] || "⬜️";
          return (
            <div key={i} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl whitespace-nowrap">{emojiDisplay}</span>
                <input
                  className="border rounded-md p-2 w-full"
                  value={item}
                  onChange={(e) => handleListChange(setItems, i, e.target.value)}
                  placeholder={`Item ${i + 1}`}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setTimeout(() => setActiveIndex(null), 200)}
                />
              </div>
              {activeIndex === i && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg px-2 py-1 border rounded hover:scale-110 transition-transform"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleEmojiClick(i, emoji);
                      }}
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSave = async () => {
  const payload = {
    view,
    identity,
    top3,
    micros,
    reward,
    reflection,
    weeklyTheme,
    weeklySteps,
    nonNegotiables,
    recovery,
    visionGoals,
    visionSteps
  };

  try {
    const res = await fetch('/api/saveFrame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) alert('✅ Frame saved to Google Sheet!');
    else alert('⚠️ Save failed');
  } catch (err) {
    console.error(err);
    alert('⚠️ Save error');
  }
};

// renderDailyFrame and others are now moved to Section component file or organized separately
}
