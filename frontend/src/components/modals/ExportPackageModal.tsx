import React, { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { ExportModalHeader } from "./export-package/ExportModalHeader";
import { ExportSummaryCard } from "./export-package/ExportSummaryCard";
import { ExportFormatList } from "./export-package/ExportFormatList";
import { ModalPortal } from "../common/ModalPortal";

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
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      cardClassName="settings-modal-container"
      ariaLabel="Export Questionnaire Deliverable"
    >
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
                <Download size={14} /> Download Package
              </>
            )}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
