import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { ModalPortal } from "../../../common/ModalPortal";
import { TuningJobFormFields } from "./TuningJobFormFields";

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
  const [baseModel, setBaseModel] = useState("gemini-2.5-flash");
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

      <TuningJobFormFields
        baseModel={baseModel}
        setBaseModel={setBaseModel}
        epochs={epochs}
        setEpochs={setEpochs}
        lrMultiplier={lrMultiplier}
        setLrMultiplier={setLrMultiplier}
        includeGoldenQa={includeGoldenQa}
        setIncludeGoldenQa={setIncludeGoldenQa}
        includeApprovedReviews={includeApprovedReviews}
        setIncludeApprovedReviews={setIncludeApprovedReviews}
        effectiveGoldenQa={effectiveGoldenQa}
        effectiveApprovedReviews={effectiveApprovedReviews}
        calculatedPairs={calculatedPairs}
      />

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
