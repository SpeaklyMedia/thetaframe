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
  // ─── VISION TRACKER STATE ──────────────────────────────────────────────
  const [visionGoals, setVisionGoals] = useState(["", "", ""]);
  const [visionSteps, setVisionSteps] = useState(["", "", ""]);

  // ─── FETCH DATA FROM GOOGLE SHEETS ─────────────────────────────────────
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
        console.log("Fetched rows:", rows);
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
          const weekRow = rows[1];
          if (weekRow) {
            setWeeklyTheme(weekRow.c[0]?.v || "");
            setWeeklySteps((weekRow.c[1]?.v || "").split("
"));
            setNonNegotiables((weekRow.c[2]?.v || "").split("
"));
            setRecovery(weekRow.c[3]?.v || "");
          }
        }
        } else if (view === "vision") {
          const visionRow = rows[1];
          if (visionRow) {
            setVisionGoals((visionRow.c[0]?.v || "").split("
"));
            setVisionSteps((visionRow.c[1]?.v || "").split("
"));
          }
        }
        }
      } catch (err) {
        console.error("Google Sheet fetch error:", err);
      }

      setActiveIndex(null);
    }

    fetchData();
  }, [view]);

  // ─── SYNC DAILY EMOJIS TO LOCAL STORAGE ───────────────────────────────
  useEffect(() => {
    localStorage.setItem("thetaframe-daily-emojis", JSON.stringify(selectedDailyEmojis));
  }, [selectedDailyEmojis]);

  // ─── SYNC WEEKLY EMOJIS TO LOCAL STORAGE ──────────────────────────────
  useEffect(() => {
    localStorage.setItem("thetaframe-weekly-emojis", JSON.stringify(selectedWeeklyEmojis));
  }, [selectedWeeklyEmojis]);
