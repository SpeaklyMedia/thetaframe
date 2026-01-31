// src/components/EmojiPicker.jsx
import { useState } from "react";

export default function EmojiPicker({
  emojis = ["😀", "😐", "😞"], // presets
  selected,
  onSelect,
  label,
}) {
  const [custom, setCustom] = useState("");

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (custom.trim()) {
      onSelect(custom.trim());
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
            className={`app-emoji-button ${
              selected === e ? "app-emoji-active scale-110" : "opacity-70"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Freeform input */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
        <input
          type="text"
          maxLength={2}
          placeholder="🔥"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          aria-label="Custom emoji"
          className="app-input w-12 px-2 text-center text-xl"
        />
        <button type="submit" className="app-button">
          Use
        </button>
      </form>
    </div>
  );
}
