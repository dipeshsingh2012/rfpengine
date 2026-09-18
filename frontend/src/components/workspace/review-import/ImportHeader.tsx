import React from "react";
import { FileText, ArrowUpRight } from "lucide-react";

interface ImportHeaderProps {
  onNavigateHome: () => void;
  hasUploadedFile: boolean;
  showDocViewer: boolean;
  onToggleDocViewer: () => void;
  selectedCount: number;
  onContinue: () => void;
}

export const ImportHeader: React.FC<ImportHeaderProps> = ({
  onNavigateHome,
  hasUploadedFile,
  showDocViewer,
  onToggleDocViewer,
  selectedCount,
  onContinue,
}) => {
  return (
    <header className="import-header">
      <div className="brand-mark" style={{ cursor: "pointer" }} onClick={onNavigateHome}>
        <span>R</span>
      </div>
      <div className="brand-name" style={{ cursor: "pointer" }} onClick={onNavigateHome}>
        RFP<span>Engine</span>
      </div>
      <span className="import-header-label">Questionnaire Curation Studio</span>

      <div className="import-header-right" style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
        {hasUploadedFile && (
          <button
            className={`toolbar-btn ${showDocViewer ? "active" : ""}`}
            onClick={onToggleDocViewer}
            title="Inspect the original PDF or file alongside extracted questions"
          >
            <FileText size={15} />
            {showDocViewer ? "Hide Original Doc" : "View Original Doc"}
          </button>
        )}
        <button
          className="primary-button continue-button"
          onClick={onContinue}
          disabled={selectedCount === 0}
          style={{ margin: 0, padding: "8px 18px", fontSize: "13px" }}
        >
          Continue to Workspace ({selectedCount}) <ArrowUpRight size={15} />
        </button>
      </div>
    </header>
  );
};

