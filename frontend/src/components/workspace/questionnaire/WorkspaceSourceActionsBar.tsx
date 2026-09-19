import React from "react";
import { Link } from "lucide-react";
import { SourceMode } from "../../../types";

interface WorkspaceSourceActionsBarProps {
  sourceMode: SourceMode;
  sourceLabel: string;
  openOriginalForm: () => void;
}

export const WorkspaceSourceActionsBar: React.FC<WorkspaceSourceActionsBarProps> = ({
  sourceMode,
  sourceLabel,
  openOriginalForm,
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
