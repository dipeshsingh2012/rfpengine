import React from "react";
import { CheckCircle, Download, Sparkles } from "lucide-react";

interface CelebrationBannerProps {
  isAllApproved: boolean;
  allQuestionsCount: number;
  isCsv: boolean;
  exportAnswers: () => void;
  openOriginalForm: () => void;
}

export const CelebrationBanner: React.FC<CelebrationBannerProps> = ({
  isAllApproved,
  allQuestionsCount,
  isCsv,
  exportAnswers,
  openOriginalForm,
}) => {
  if (!isAllApproved) return null;

  return (
    <div className="celebration-banner">
      <div>
        <strong>
          <CheckCircle size={18} /> Governance Complete: All {allQuestionsCount} Responses Approved!
        </strong>
        <p>
          {isCsv
            ? "All answers have passed approval. Ready to export completed questionnaire as CSV."
            : "All answers have passed SME & Legal reviews. Ready for 1-click buyer form injection."}
        </p>
      </div>
      {isCsv ? (
        <button
          className="primary-button"
          onClick={exportAnswers}
          style={{ padding: "8px 16px" }}
        >
          <Download size={14} /> 📥 Export CSV with Generated Answers
        </button>
      ) : (
        <button
          className="primary-button"
          onClick={openOriginalForm}
          style={{ padding: "8px 16px" }}
        >
          <Sparkles size={14} /> ⚡ Inject Answers into Buyer Form
        </button>
      )}
    </div>
  );
};

