import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { ModalPortal } from "../../../common/ModalPortal";

interface Props {
  isOpen: boolean;
  isStarting: boolean;
  totalPairs?: number;
  goldenQaCount?: number;
  approvedReviewsCount?: number;
  onClose: () => void;
  onSubmit: (
    baseModel: string,
    epochs: number,
    lrMultiplier: number,
    includeGoldenQa?: boolean,
    includeApprovedReviews?: boolean
  ) => Promise<boolean>;
}

export const NewTuningJobModal: React.FC<Props> = ({
  isOpen,
  isStarting,
  totalPairs = 0,
  goldenQaCount,
  approvedReviewsCount,
  onClose,
  onSubmit,
}) => {
  const [baseModel, setBaseModel] = useState("gemini-1.5-flash-002");
  const [epochs, setEpochs] = useState(4);
  const [lrMultiplier, setLrMultiplier] = useState(1.0);
  const [includeGoldenQa, setIncludeGoldenQa] = useState(true);
  const [includeApprovedReviews, setIncludeApprovedReviews] = useState(true);

  const effectiveGoldenQa = goldenQaCount !== undefined ? goldenQaCount : Math.floor(totalPairs * 0.6);
  const effectiveApprovedReviews = approvedReviewsCount !== undefined ? approvedReviewsCount : Math.ceil(totalPairs * 0.4);
  const calculatedPairs =
    (includeGoldenQa ? effectiveGoldenQa : 0) + (includeApprovedReviews ? effectiveApprovedReviews : 0);

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      cardClassName="modal-card new-tuning-modal"
      ariaLabel="Launch Gemini Tuning Job"
    >
      <div className="modal-header">
        <div className="modal-title-row">
          <Sparkles size={16} color="var(--blue)" />
          <h3>Launch Gemini Tuning Job</h3>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          <X size={16} />
        </button>
      </div>

      <div className="modal-body form-grid">
        <div className="form-group">
          <label>Base Gemini Model</label>
          <select value={baseModel} onChange={(e) => setBaseModel(e.target.value)}>
            <option value="gemini-1.5-flash-002">Gemini 1.5 Flash-002 (Fast, Cost-efficient)</option>
            <option value="gemini-1.5-pro-002">Gemini 1.5 Pro-002 (Complex Enterprise Reasoning)</option>
          </select>
          <span className="settings-field-hint">
            Vertex AI Supervised Tuning requires a supported stable base checkpoint.
          </span>
        </div>

        <div className="form-group">
          <label>Supervised Training Datasets</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "normal" }}>
              <input
                type="checkbox"
                checked={includeGoldenQa}
                onChange={(e) => setIncludeGoldenQa(e.target.checked)}
              />
              <span>Include Canonical Golden Q&A ({effectiveGoldenQa} pairs)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "normal" }}>
              <input
                type="checkbox"
                checked={includeApprovedReviews}
                onChange={(e) => setIncludeApprovedReviews(e.target.checked)}
              />
              <span>Include SME Approved RFP Responses ({effectiveApprovedReviews} pairs)</span>
            </label>
          </div>
          <span className="settings-field-hint">
            Curate human-vetted ground truth to tailor the tuned model's answers.
          </span>
        </div>

        <div className="settings-grid-2">
          <div className="form-group">
            <label>Epochs ({epochs})</label>
            <input
              type="number"
              min={1}
              max={10}
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>LR Multiplier ({lrMultiplier}x)</label>
            <select
              value={lrMultiplier}
              onChange={(e) => setLrMultiplier(Number(e.target.value))}
            >
              <option value={0.5}>0.5x (Conservative)</option>
              <option value={1.0}>1.0x (Default)</option>
              <option value={2.0}>2.0x (Aggressive)</option>
            </select>
          </div>
        </div>

        <div className="revision-question-preview">
          Dataset: <strong>{calculatedPairs} supervised pairs</strong> will be staged to Google Cloud Vertex AI in multi-turn JSONL format.
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onClose} disabled={isStarting}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => onSubmit(baseModel, epochs, lrMultiplier, includeGoldenQa, includeApprovedReviews)}
          disabled={isStarting || calculatedPairs === 0}
        >
          {isStarting ? "Submitting Job..." : "Start Vertex AI Tuning"}
        </button>
      </div>
    </ModalPortal>
  );
};
