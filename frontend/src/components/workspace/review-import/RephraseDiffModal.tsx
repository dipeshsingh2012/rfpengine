import React from "react";
import { Sparkles, X } from "lucide-react";

interface RephraseDiffModalProps {
  data: { index: number; original: string; rephrased: string } | null;
  onAccept: () => void;
  onClose: () => void;
}

export const RephraseDiffModal: React.FC<RephraseDiffModalProps> = ({ data, onAccept, onClose }) => {
  if (!data) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card rephrase-diff-modal">
        <div className="modal-header">
          <div className="modal-title-row">
            <Sparkles size={18} style={{ color: "#d97706" }} />
            <h3>Question Rephrasing with Gemini 2.5 Flash</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="rephrase-diff-body">
          <div className="diff-panel original">
            <h4>Original Text</h4>
            <p>{data.original}</p>
          </div>
          <div className="diff-panel suggested">
            <h4>Suggested Rephrasing</h4>
            <p>{data.rephrased}</p>
          </div>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={onAccept}>
            Accept Rephrase
          </button>
          <button className="outline-button" onClick={onClose}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

