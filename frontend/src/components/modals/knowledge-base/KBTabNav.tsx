import React from "react";
import { Upload, RefreshCw, Zap } from "lucide-react";

interface KBTabNavProps {
  tab: "upload" | "connectors" | "playground";
  setTab: (tab: "upload" | "connectors" | "playground") => void;
  sourcesCount: number;
}

export const KBTabNav: React.FC<KBTabNavProps> = ({ tab, setTab, sourcesCount }) => {
  return (
    <div className="kb-tabs-nav">
      <button
        className={`kb-tab-item ${tab === "upload" ? "active" : ""}`}
        onClick={() => setTab("upload")}
      >
        <Upload size={14} /> Manual Ingestion & Data
      </button>
      <button
        className={`kb-tab-item ${tab === "connectors" ? "active" : ""}`}
        onClick={() => setTab("connectors")}
      >
        <RefreshCw size={14} /> Automated Connectors & Sync
        {sourcesCount > 0 && (
          <span className="kb-badge-counter">{sourcesCount}</span>
        )}
      </button>
      <button
        className={`kb-tab-item ${tab === "playground" ? "active" : ""}`}
        onClick={() => setTab("playground")}
      >
        <Zap size={14} /> RAG Retrieval Playground
      </button>
    </div>
  );
};

