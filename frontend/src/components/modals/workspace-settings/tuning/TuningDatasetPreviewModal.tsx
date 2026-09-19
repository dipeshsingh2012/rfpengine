import React, { useState } from "react";
import { X, Eye, CheckCircle2, AlertTriangle, UserCheck, Bot } from "lucide-react";
import { TuningDatasetPreview } from "../../../../types";
import { ModalPortal } from "../../../common/ModalPortal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preview: TuningDatasetPreview | null;
}

export const TuningDatasetPreviewModal: React.FC<Props> = ({ isOpen, onClose, preview }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const samples = preview?.sample_pairs || [];
  const current = samples[activeIdx];
  const isValid = (preview?.total_pairs || 0) >= 10;

  const userMsg = current?.messages.find((m) => m.role === "user")?.content || "";
  const modelMsg = current?.messages.find((m) => m.role === "model")?.content || "";
  const sysMsg = current?.messages.find((m) => m.role === "system")?.content || "";

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} cardClassName="modal-card tuning-studio-modal" ariaLabel="Dataset Preview">
      <div className="modal-header">
        <div className="modal-title-row">
          <Eye size={18} color="var(--blue)" />
          <h3>Supervised Dataset Preview & Validation</h3>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
      </div>

      <div className="modal-body form-grid" style={{ gap: "14px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: isValid ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", color: isValid ? "#059669" : "#d97706" }}>
            {isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {isValid ? `Pass: ${preview?.total_pairs} pairs (>=10 required)` : "Warning: < 10 pairs"}
          </span>
          <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "var(--bg-subtle, #f1f5f9)", color: "var(--muted)" }}>
            Format: Vertex AI Chat SFT (JSONL)
          </span>
          <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "var(--bg-subtle, #f1f5f9)", color: "var(--muted)" }}>
            Sources: {preview?.golden_qa_count || 0} Golden Q&A + {preview?.approved_reviews_count || 0} Approved Reviews
          </span>
        </div>

        {samples.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              {samples.map((_, i) => {
                const isActive = activeIdx === i;
                return (
                  <button key={i} type="button" onClick={() => setActiveIdx(i)} className={isActive ? "primary-button" : "secondary-button"} style={{ padding: "4px 10px", fontSize: "12px" }}>
                    Sample {i + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sysMsg && (
                <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "11px", color: "var(--muted)" }}>
                  <strong>System Context:</strong> {sysMsg}
                </div>
              )}
              <div style={{ background: "rgba(59,130,246,0.05)", padding: "10px 12px", borderRadius: "6px", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--blue)", marginBottom: "4px" }}>
                  <UserCheck size={13} /> User Prompt (RFP Question)
                </div>
                <div style={{ fontSize: "13px", color: "var(--ink)" }}>{userMsg}</div>
              </div>
              <div style={{ background: "rgba(16,185,129,0.05)", padding: "10px 12px", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#059669", marginBottom: "4px" }}>
                  <Bot size={13} /> Target Response (Approved Answer)
                </div>
                <div style={{ fontSize: "13px", color: "var(--ink)", whiteSpace: "pre-wrap" }}>{modelMsg}</div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center", margin: "24px 0" }}>
            No sample pairs available yet. Approve RFP reviews or add Golden Q&A to inspect.
          </p>
        )}
      </div>

      <div className="modal-footer">
        <button type="button" className="secondary-button" onClick={onClose}>Close</button>
      </div>
    </ModalPortal>
  );
};

