import React from "react";
import { Award, Sparkles, Trash2 } from "lucide-react";
import { KBItem } from "../../../types";

interface KBRecordItemProps {
  entry: KBItem;
  onDelete: (id: string) => void;
}

export const KBRecordItem: React.FC<KBRecordItemProps> = ({ entry, onDelete }) => {
  const isExemplar = Boolean(entry.metadata?.is_exemplar);
  const displayText = entry.content || (entry.question ? `Q: ${entry.question}\nA: ${entry.answer}` : entry.title || "No content");
  const sourceName = entry.title || entry.metadata?.source || "Knowledge Base";

  return (
    <div className={`kb-entry-card ${isExemplar ? "exemplar-card" : ""}`}>
      <div className="kb-entry-header">
        <span className="kb-entry-source">
          {isExemplar ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#15803d", fontWeight: 700 }}>
              <Award size={13} /> Golden Exemplar ({sourceName})
            </span>
          ) : (
            sourceName
          )}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {entry.category && <span className="kb-entry-category">{entry.category}</span>}
          {isExemplar && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "1px 6px", borderRadius: "4px", border: "1px solid #fcd34d" }}>
              <Sparkles size={10} style={{ display: "inline", marginRight: "2px" }} /> Few-Shot
            </span>
          )}
          <button className="icon-button delete" onClick={() => onDelete(entry.id)} title="Delete record">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="kb-entry-body">
        <p className="kb-entry-text">{displayText}</p>
      </div>
      <div className="kb-entry-footer">
        <span>ID: {entry.id}</span>
        {entry.created_at && <span>{new Date(entry.created_at).toLocaleDateString()}</span>}
      </div>
    </div>
  );
};

