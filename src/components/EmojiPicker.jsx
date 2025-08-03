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
      {label && <span className="font-medium">{label}</span>}

      {/* Preset buttons */}
      <div className="flex space-x-2">
        {emojis.map((e, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(e)}
            className={`text-2xl focus:outline-none ${
              selected === e ? "scale-125" : "opacity-60"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Freeform input */}
      <form onSubmit={handleCustomSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          maxLength={2}
          placeholder="🔥"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="w-12 text-xl text-center border rounded"
        />
        <button type="submit" className="px-2 py-1 border rounded">
          Use
        </button>
      </form>
    </div>
  );
}
