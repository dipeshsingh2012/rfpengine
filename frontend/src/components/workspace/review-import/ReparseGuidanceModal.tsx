import React from "react";
import { RefreshCw, X } from "lucide-react";

interface ReparseGuidanceModalProps {
  isOpen: boolean;
  guidance: string;
  setGuidance: (guidance: string) => void;
  isReparsing: boolean;
  onExecuteReparse: () => void;
  onClose: () => void;
}

export const ReparseGuidanceModal: React.FC<ReparseGuidanceModalProps> = ({
  isOpen,
  guidance,
  setGuidance,
  isReparsing,
  onExecuteReparse,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card reparse-modal">
        <div className="modal-header">
          <div className="modal-title-row">
            <RefreshCw size={18} style={{ color: "#2563eb" }} />
            <h3>Re-Parse Document with Gemini 2.5 Flash</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="reparse-modal-body">
          <p className="reparse-desc">
            Provide custom extraction guidance to tune how Gemini reads your RFP (e.g. split compound items or focus on specific technical sections).
          </p>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder="e.g. Focus exclusively on Section 3 Security Requirements and split multi-part questions into individual items."
            rows={3}
          />
          <div className="guidance-chips">
            <span className="chips-label">Quick Suggestions:</span>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setGuidance("Focus on Technical Security and Data Protection requirements only.")}
            >
              Security Only
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setGuidance("Split all compound or multi-part questions into separate items.")}
            >
              Split Compound Items
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setGuidance("Extract every bullet point and sub-item as an individual question.")}
            >
              Extract All Bullets
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={onExecuteReparse} disabled={isReparsing}>
            {isReparsing ? "Re-Parsing..." : "Re-Parse Document 🔄"}
          </button>
          <button className="outline-button" onClick={onClose} disabled={isReparsing}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

