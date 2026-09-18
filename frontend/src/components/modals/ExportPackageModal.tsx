import React, { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { ExportModalHeader } from "./export-package/ExportModalHeader";
import { ExportSummaryCard } from "./export-package/ExportSummaryCard";
import { ExportFormatList } from "./export-package/ExportFormatList";

export type ExportFormat = "xlsx" | "docx" | "pdf" | "csv";

interface ExportPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalQuestions: number;
  approvedCount: number;
  onExport: (format: ExportFormat) => Promise<void>;
}

export const ExportPackageModal: React.FC<ExportPackageModalProps> = ({
  isOpen,
  onClose,
  title,
  totalQuestions,
  approvedCount,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  async function handleConfirmExport() {
    setIsExporting(true);
    try {
      await onExport(selectedFormat);
      onClose();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="kb-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <ExportModalHeader onClose={onClose} />

        <div className="settings-modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <ExportSummaryCard
            title={title}
            totalQuestions={totalQuestions}
            approvedCount={approvedCount}
          />

          <ExportFormatList
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
          />
        </div>

        <div className="settings-modal-footer">
          <div className="settings-footer-status">
            <span>Ready to generate client-facing package</span>
          </div>
          <div className="settings-footer-actions">
            <button className="secondary-button" onClick={onClose} disabled={isExporting}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={handleConfirmExport}
              disabled={isExporting}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              {isExporting ? (
                <>
                  <RefreshCw size={14} className="spin" /> Generating...
                </>
              ) : (
                <>
                  <Download size={14} /> Export Deliverable
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
