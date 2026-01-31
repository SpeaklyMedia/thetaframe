// src/components/Section.jsx
import React from "react";

export default function Section({ label, description, children }) {
  return (
    <section className="app-card space-y-3">
      <div className="space-y-1">
        <label className="app-section-title">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      </div>
      {children}
    </section>
  );
}
