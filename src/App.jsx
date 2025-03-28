import { useEffect, useState } from "react";

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
  const [selectedDailyEmojis, setSelectedDailyEmojis] = useState({});
  const [selectedWeeklyEmojis, setSelectedWeeklyEmojis] = useState({});
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

  const renderDailyFrame = () => (
    <div className="bg-white shadow-md rounded-xl p-6 grid gap-6">
      <div>
        <label className="font-medium text-sm sm:text-base">🧠 If you could reprogram one belief about yourself today, what would it be?</label>
        <p className="text-xs text-gray-500 mb-2">Use this to activate your desired identity. Speak it in present tense and let it guide your actions.</p>
        <input
          className="border rounded-md p-2 w-full"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="I am..."
        />
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">✅ Top 3 Actions</label>
        <p className="text-xs text-gray-500 mb-2">What 3 things would make today feel like a win? Use emojis to emotionally anchor each one.</p>
        {renderEditableList(top3, setTop3, 'top3')}
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">⚡ Micro-Moves</label>
        <p className="text-xs text-gray-500 mb-2">Tiny tasks that build momentum. Choose actions that are frictionless, fast, and forward-moving.</p>
        {renderEditableList(micros, setMicros, 'micros')}
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">🌀 Reward</label>
        <input
          className="border rounded-md p-2 w-full"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="Reward for completing your day"
        />
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">🌙 Reflection</label>
        <textarea
          className="border rounded-md p-2 w-full"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="End of day notes, emotions, insights..."
        />
      </div>
    </div>
  );

  const renderWeeklyRhythm = () => (
    <div className="bg-white shadow-md rounded-xl p-6 grid gap-6">
      <div>
        <label className="font-medium text-sm sm:text-base">📌 Weekly Intent / Theme</label>
        <input
          className="border rounded-md p-2 w-full"
          value={weeklyTheme}
          onChange={(e) => setWeeklyTheme(e.target.value)}
          placeholder="This week I..."
        />
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">👣 3 Small Steps To Take Towards Your Big Vision</label>
        {renderEditableList(weeklySteps, setWeeklySteps, 'weeklySteps')}
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">🔒 Non-Negotiables</label>
        {renderEditableList(nonNegotiables, setNonNegotiables, 'nonNegotiables')}
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">🛁 Recovery Plan</label>
        <input
          className="border rounded-md p-2 w-full"
          value={recovery}
          onChange={(e) => setRecovery(e.target.value)}
          placeholder="Walk in nature, night off, music session..."
        />
      </div>
    </div>
  );

  const renderVisionTracker = () => (
    <div className="bg-white shadow-md rounded-xl p-6 grid gap-6">
      <div>
        <label className="font-medium text-sm sm:text-base">🌅 Vision Goals</label>
        {renderEditableList(visionGoals, setVisionGoals, 'visionGoals')}
      </div>
      <div>
        <label className="font-medium text-sm sm:text-base">🏗️ Key Steps</label>
        {renderEditableList(visionSteps, setVisionSteps, 'visionSteps')}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 grid gap-6 max-w-3xl mx-auto">
      {view === "daily" && (
        <div className="text-right">
          <button
            onClick={() => alert("Saving today’s frame... (this will eventually write to your sheet or localStorage)")}
            className="text-sm px-3 py-1 border border-black rounded hover:bg-black hover:text-white transition"
          >
            💾 Save Today’s Frame
          </button>
        </div>
      )}
<h1 className="text-2xl sm:text-3xl font-bold text-center">🌊 ThetaFrame</h1>
      <p className="text-center text-sm text-gray-500 -mt-4">
        A daily interface for subconscious reprogramming. Use this tool during your morning theta state (or while calm and reflective) to align your identity and actions with the future you're creating.
      </p>

      <div className="flex justify-center gap-4 my-4">
        <button onClick={() => setView("daily")} className={`px-4 py-2 rounded-md ${view === "daily" ? "bg-black text-white" : "bg-gray-200"}`}>
          Daily Frame
        </button>
        <button onClick={() => setView("weekly")} className={`px-4 py-2 rounded-md ${view === "weekly" ? "bg-black text-white" : "bg-gray-200"}`}>
          Weekly Rhythm
        </button>
        <button onClick={() => setView("vision")} className={`px-4 py-2 rounded-md ${view === "vision" ? "bg-black text-white" : "bg-gray-200"}`}>
          Vision Tracker
        </button>
      </div>

      {view === "daily" ? renderDailyFrame() : view === "weekly" ? renderWeeklyRhythm() : renderVisionTracker()}
    </div>
  );
}
