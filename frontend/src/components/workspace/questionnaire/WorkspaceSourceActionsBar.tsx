import React from "react";
import { Link, Download } from "lucide-react";
import { SourceMode } from "../../../types";

interface WorkspaceSourceActionsBarProps {
  sourceMode: SourceMode;
  sourceLabel: string;
  openOriginalForm: () => void;
  onOpenExportModal?: () => void;
  isAllFilled: boolean;
  answeredQuestionsCount: number;
  totalQuestionsCount: number;
}

export const WorkspaceSourceActionsBar: React.FC<WorkspaceSourceActionsBarProps> = ({
  sourceMode,
  sourceLabel,
  openOriginalForm,
  onOpenExportModal,
  isAllFilled,
  answeredQuestionsCount,
  totalQuestionsCount,
}) => {
  const isCsv = sourceLabel.toLowerCase().endsWith(".csv");
  const isUpload = sourceMode === "upload";

  return (
    <div className="source-actions">
      <span className="source-badge">
        {sourceMode === "url"
          ? "Hosted form"
          : sourceMode === "upload"
            ? "Uploaded form"
            : "Live page"}{" "}
        · {sourceLabel}
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
        {onOpenExportModal && (
          <button
            className={`outline-button ${!isAllFilled ? "button-disabled" : ""}`}
            onClick={isAllFilled ? onOpenExportModal : undefined}
            disabled={!isAllFilled}
            title={
              isAllFilled
                ? "Export compliance matrix to Excel, Word, or PDF"
                : `Complete all ${totalQuestionsCount} responses to export deliverable (${answeredQuestionsCount}/${totalQuestionsCount} filled)`
            }
            style={!isAllFilled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <Download size={15} /> Export Deliverable
            {!isAllFilled && (
              <span style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.85 }}>
                ({answeredQuestionsCount}/{totalQuestionsCount})
              </span>
            )}
          </button>
        )}
        {!isCsv && !isUpload && (
          <button
            className="outline-button"
            onClick={openOriginalForm}
            title="Launch buyer form with pre-approved answers"
          >
            <Link size={15} /> Open original form
          </button>
        )}
      </div>
    </div>
  );
};

