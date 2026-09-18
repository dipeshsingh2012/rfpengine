import React from "react";
import { Sparkles, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";

interface AiFeedbackBannerProps {
  sourceStatus: string;
  feedbackNotice: string;
  feedbackRating: "thumbs_up" | "thumbs_down" | null;
  onRateAccuracy: (rating: "thumbs_up" | "thumbs_down") => void;
  hasUploadedFile: boolean;
  onOpenReparseModal: () => void;
}

export const AiFeedbackBanner: React.FC<AiFeedbackBannerProps> = ({
  sourceStatus,
  feedbackNotice,
  feedbackRating,
  onRateAccuracy,
  hasUploadedFile,
  onOpenReparseModal,
}) => {
  return (
    <section className="ai-feedback-banner panel">
      <div className="ai-banner-left">
        <div className="ai-engine-badge">
          <Sparkles size={16} />
          <span>Gemini 2.5 Flash Grounded Parser</span>
        </div>
        <p className="ai-banner-desc">
          {sourceStatus || "Document parsed into structured compliance requirements."}
        </p>
        {feedbackNotice && <p className="feedback-toast-inline">✓ {feedbackNotice}</p>}
      </div>

      <div className="ai-banner-actions">
        <div className="accuracy-rate-group">
          <span className="rate-label">Extraction Quality:</span>
          <button
            className={`rate-btn ${feedbackRating === "thumbs_up" ? "active-up" : ""}`}
            onClick={() => onRateAccuracy("thumbs_up")}
            title="Good extraction accuracy"
          >
            <ThumbsUp size={14} /> Accurate
          </button>
          <button
            className={`rate-btn ${feedbackRating === "thumbs_down" ? "active-down" : ""}`}
            onClick={() => onRateAccuracy("thumbs_down")}
            title="Extraction missed items or included noise"
          >
            <ThumbsDown size={14} /> Needs Tuning
          </button>
        </div>

        {hasUploadedFile && (
          <button
            className="outline-button reparse-btn"
            onClick={onOpenReparseModal}
            title="Re-run full extraction with custom Gemini guidance"
          >
            <RefreshCw size={14} /> Re-Parse with AI
          </button>
        )}
      </div>
    </section>
  );
};

