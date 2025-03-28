
import { useEffect, useState } from "react";

export default function App() {
  const [identity, setIdentity] = useState("");
  const [top3, setTop3] = useState(["", "", ""]);
  const [micros, setMicros] = useState(["", "", ""]);
  const [reward, setReward] = useState("");
  const [reflection, setReflection] = useState("");

  const handleTop3Change = (index, value) => {
    const updated = [...top3];
    updated[index] = value;
    setTop3(updated);
  };

  const handleMicrosChange = (index, value) => {
    const updated = [...micros];
    updated[index] = value;
    setMicros(updated);
  };

  useEffect(() => {
    async function fetchData() {
      const sheetId = "10apZA63eEHOz310nuDXYMxHem9DN83S5";
      const sheetName = "Daily Frame";
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      try {
        const res = await fetch(url);
        const text = await res.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));

        const rows = json.table.rows;
        const day = new Date().toLocaleString("en-US", { weekday: "long" });

        const todayRow = rows.find(row => row.c[0]?.v === day);
        if (todayRow) {
          setIdentity(todayRow.c[1]?.v || "");
          setTop3((todayRow.c[2]?.v || "").split("\n"));
          setMicros((todayRow.c[3]?.v || "").split("\n"));
          setReward(todayRow.c[4]?.v || "");
          setReflection(todayRow.c[5]?.v || "");
        }
      } catch (err) {
        console.error("Failed to fetch Google Sheet data:", err);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 sm:p-6 grid gap-6 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">🌊 ThetaFrame</h1>
      <p className="text-center text-sm text-gray-500 -mt-4">Drop in. Rewire. Rise.</p>

      <div className="bg-white shadow-md rounded-xl p-6 grid gap-4">
        <label className="font-medium text-sm sm:text-base">🧠 Identity</label>
        <input
          className="border rounded-md p-2"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
        />

        <label className="font-medium mt-4 text-sm sm:text-base">✅ Top 3 Actions</label>
        {top3.map((item, i) => (
          <input
            key={i}
            className="border rounded-md p-2"
            value={item}
            onChange={(e) => handleTop3Change(i, e.target.value)}
            placeholder={`Action ${i + 1}`}
          />
        ))}

        <label className="font-medium mt-4 text-sm sm:text-base">⚡ Micro-Moves</label>
        {micros.map((item, i) => (
          <input
            key={i}
            className="border rounded-md p-2"
            value={item}
            onChange={(e) => handleMicrosChange(i, e.target.value)}
            placeholder={`Micro-Move ${i + 1}`}
          />
        ))}

        <label className="font-medium mt-4 text-sm sm:text-base">🌀 Reward</label>
        <input
          className="border rounded-md p-2"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="Reward for completing your day"
        />

        <label className="font-medium mt-4 text-sm sm:text-base">🌙 Reflection</label>
        <textarea
          className="border rounded-md p-2"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="End of day notes, emotions, insights..."
        />

        <button className="mt-6 sm:mt-4 w-full sm:w-auto bg-black text-white px-6 py-2 rounded-md">
          Save Today’s Frame
        </button>
      </div>
    </div>
  );
}
