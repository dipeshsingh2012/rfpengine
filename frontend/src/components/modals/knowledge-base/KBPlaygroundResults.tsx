import React from "react";
import { Shield } from "lucide-react";
import { SearchResponse } from "../../../types";

interface KBPlaygroundResultsProps {
  result: SearchResponse;
}

export const KBPlaygroundResults: React.FC<KBPlaygroundResultsProps> = ({ result }) => {
  return (
    <div className="playground-results-panel">
      <div className="playground-results-header">
        <div>
          <span className="eyebrow">Retrieved Passages ({result.sources.length})</span>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            Confidence Score: <strong>{(result.confidence_score * 100).toFixed(0)}%</strong>
          </div>
        </div>
        {result.tone_applied && (
          <span className="source-tag" style={{ background: "#ecfdf5", color: "#065f46" }}>
            <Shield size={12} /> {result.tone_applied}
          </span>
        )}
      </div>
      <div className="playground-sources-list">
        {result.sources.map((src) => (
          <div key={src.id} className="playground-source-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <strong style={{ fontSize: "12px", color: "var(--navy)" }}>{src.question}</strong>
              <span style={{ fontSize: "11px", color: "var(--blue)", fontWeight: 700 }}>
                {(src.score * 100).toFixed(0)}% Match
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink)", lineHeight: 1.4 }}>{src.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

