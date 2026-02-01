// src/components/EmojiPicker.jsx
import { useState } from "react";

export default function EmojiPicker({
  emojis = ["😀", "😐", "😞"], // presets
  selected,
  onSelect = () => {},
  label,
}) {
  const [custom, setCustom] = useState("");

  const commitCustom = () => {
    const value = custom.trim();
    if (value) {
      onSelect(value);
      setCustom("");
    }
  };

  return (
    <div className="emoji-picker flex flex-col space-y-2 my-2">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {emojis.map((e, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(e)}
            aria-label={`Select emoji ${e}`}
            aria-pressed={selected === e}
            title={`Select ${e}`}
            className={`app-emoji-button ${
              selected === e ? "app-emoji-active scale-110" : "opacity-70"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Freeform input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          maxLength={4}
          placeholder="🔥"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustom();
            }
          }}
          aria-label="Custom emoji"
          className="app-input w-12 px-2 text-center text-xl"
        />
        <span className="text-xs text-slate-500">Tap enter or blur to apply</span>
      </div>
    </div>
  );
}
