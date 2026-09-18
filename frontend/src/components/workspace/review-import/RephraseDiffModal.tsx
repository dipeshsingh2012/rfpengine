import React from "react";
import { Sparkles, X } from "lucide-react";
import { ModalPortal } from "../../common/ModalPortal";

interface RephraseDiffModalProps {
  data: { index: number; original: string; rephrased: string } | null;
  onAccept: () => void;
  onClose: () => void;
}

export const RephraseDiffModal: React.FC<RephraseDiffModalProps> = ({ data, onAccept, onClose }) => {
  return (
    <ModalPortal
      isOpen={Boolean(data)}
      onClose={onClose}
      cardClassName="modal-card rephrase-diff-modal"
      ariaLabel="Question Rephrasing with Gemini 2.5 Flash"
    >
      <div className="modal-header">
        <div className="modal-title-row">
          <Sparkles size={18} style={{ color: "#d97706" }} />
          <h3>Question Rephrasing with Gemini 2.5 Flash</h3>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          <X size={16} />
        </button>
      </div>
      {data && (
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
      )}
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose}>
          Discard
        </button>
        <button className="primary-button" onClick={onAccept}>
          Accept Rephrase
        </button>
      </div>
    </ModalPortal>
  );
};
