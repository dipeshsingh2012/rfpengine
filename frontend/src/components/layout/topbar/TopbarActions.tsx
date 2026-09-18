import React from "react";
import { TrendingUp, AlertCircle } from "lucide-react";

export const TopbarActions: React.FC = () => {
  return (
    <>
      <div className="topbar-spacer" />
      <a
        href="https://rfpengine.aroadmap.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="outline-button"
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#eef2ff",
          borderColor: "#c7d2fe",
          color: "var(--blue)",
          fontWeight: 700,
          textDecoration: "none",
        }}
        title="Open live strategy & PRD roadmap on aroadmap.dev"
      >
        <TrendingUp size={14} /> 🗺️ Roadmap (aroadmap.dev)
      </a>
      <button className="icon-button" title="Open notifications">
        <AlertCircle size={18} />
      </button>
      <button className="avatar" title="Account menu">
        JD
      </button>
    </>
  );
};

