import React from "react";
import { CheckCircle, Download, Sparkles } from "lucide-react";
import { SourceMode } from "../../types";

interface CelebrationBannerProps {
  isAllApproved: boolean;
  allQuestionsCount: number;
  isCsv: boolean;
  exportAnswers: () => void;
  openOriginalForm: () => void;
  onOpenExportModal?: () => void;
  sourceMode?: SourceMode;
}

export const CelebrationBanner: React.FC<CelebrationBannerProps> = ({
  isAllApproved,
  allQuestionsCount,
  isCsv,
  exportAnswers,
  openOriginalForm,
  onOpenExportModal,
  sourceMode,
}) => {
  if (!isAllApproved) return null;

  const isUpload = sourceMode === "upload";

  return (
    <div className="celebration-banner">
      <div>
        <strong>
          <CheckCircle size={18} /> Governance Complete: All {allQuestionsCount} Responses Approved!
        </strong>
        <p>
          {isUpload
            ? "All answers have passed SME & Legal reviews. Ready to export an audit-ready compliance package (.xlsx, .docx, .pdf)."
            : "All answers have passed SME & Legal reviews. Ready to export an audit-ready compliance package or inject into external buyer forms."}
        </p>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          className="primary-button"
          onClick={onOpenExportModal || exportAnswers}
          style={{ padding: "8px 18px", fontWeight: 600 }}
        >
          <Download size={15} /> 📥 Export Audit Package (.xlsx, .docx, .pdf)
        </button>
        {!isCsv && !isUpload && (
          <button
            className="outline-button"
            onClick={openOriginalForm}
            style={{ padding: "8px 14px", background: "white" }}
          >
            <Sparkles size={14} /> ⚡ Inject into Buyer Form
          </button>
        )}
      </div>
    </div>
  );
};


