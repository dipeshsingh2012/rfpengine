import React from "react";
import { Database, Sparkles, CheckCircle, RefreshCw } from "lucide-react";
import { TuningDatasetPreview } from "../../../../types";

interface Props {
  preview: TuningDatasetPreview | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const TuningDatasetStatsCard: React.FC<Props> = ({ preview, isLoading, onRefresh }) => {
  return (
    <div className="settings-group-card" style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="settings-group-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={16} color="var(--blue)" /> Supervised Dataset Ground Truth
          </div>
          <p className="settings-group-subtitle" style={{ margin: "2px 0 0" }}>
            Pairs extracted from vetted Golden Q&A and SME-approved RFP responses formatted for Vertex AI.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="settings-action-btn"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
        >
          <RefreshCw size={13} className={isLoading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <div className="settings-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
        <div style={{ background: "var(--bg-subtle, rgba(0,0,0,0.03))", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Total SFT Pairs</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--blue)", marginTop: "4px" }}>
            {preview ? preview.total_pairs : "—"}
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Ready for training</span>
        </div>

        <div style={{ background: "var(--bg-subtle, rgba(0,0,0,0.03))", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
            <Sparkles size={12} color="#f59e0b" /> Golden Q&A
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>
            {preview ? preview.golden_qa_count : "—"}
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Canonical enterprise truth</span>
        </div>

        <div style={{ background: "var(--bg-subtle, rgba(0,0,0,0.03))", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
            <CheckCircle size={12} color="#10b981" /> Approved Reviews
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
            {preview ? preview.approved_reviews_count : "—"}
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Vetted past responses</span>
        </div>
      </div>
    </div>
  );
};

