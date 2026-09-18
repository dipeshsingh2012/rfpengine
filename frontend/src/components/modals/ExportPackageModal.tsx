import React, { useState } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

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

  const pctApproved =
    totalQuestions > 0 ? Math.round((approvedCount / totalQuestions) * 100) : 0;

  async function handleDownload() {
    setIsExporting(true);
    try {
      await onExport(selectedFormat);
      onClose();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  const formatOptions: Array<{
    id: ExportFormat;
    label: string;
    ext: string;
    badge: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: "xlsx",
      label: "Excel Compliance Matrix",
      ext: ".xlsx",
      badge: "Most Popular",
      description:
        "Two-sheet styled workbook with auto-filters, SME status color codes, and Audit Trail & Citations summary.",
      icon: <FileSpreadsheet size={24} />,
      color: "var(--accent, #2563eb)",
    },
    {
      id: "docx",
      label: "Word Executive Document",
      ext: ".docx",
      badge: "Audit Ready",
      description:
        "Formal submission package with executive cover metadata, Q&A blocks, SME verification stamps, and citation appendix.",
      icon: <FileText size={24} />,
      color: "#0284c7",
    },
    {
      id: "pdf",
      label: "PDF Compliance Report",
      ext: ".pdf",
      badge: "Print / Sign",
      description:
        "Audit-stamped deliverable with governance metrics table, verified evidence citations, and cryptographic footer.",
      icon: <ShieldCheck size={24} />,
      color: "#dc2626",
    },
    {
      id: "csv",
      label: "Raw CSV Spreadsheet",
      ext: ".csv",
      badge: "Data Import",
      description:
        "Standard UTF-8 comma-separated file for automated ingestion into external CRM or procurement portals.",
      icon: <FileCode size={24} />,
      color: "#475569",
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "600px", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
          }}
        >
          <div>
            <span className="eyebrow">Enterprise Deliverable</span>
            <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 700 }}>
              Export Compliance Package
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} style={{ padding: "6px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Scope and Governance Summary Card */}
        <div
          style={{
            background: "var(--background, #f8fafc)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--ink, #0f172a)",
                maxWidth: "340px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title || "Questionnaire Responses"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
              {totalQuestions} questions &bull; {approvedCount} approved ({pctApproved}%)
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: pctApproved === 100 ? "#16a34a" : "#ca8a04",
              background: pctApproved === 100 ? "#dcfce7" : "#fef9c3",
              padding: "4px 10px",
              borderRadius: "16px",
            }}
          >
            <CheckCircle2 size={13} />
            {pctApproved === 100 ? "100% Approved" : `${pctApproved}% Ready`}
          </div>
        </div>

        {/* Format Selection Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {formatOptions.map((opt) => {
            const isSelected = selectedFormat === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedFormat(opt.id)}
                style={{
                  border: isSelected
                    ? "2px solid var(--accent, #2563eb)"
                    : "1px solid var(--border, #e2e8f0)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: isSelected ? "rgba(37, 99, 235, 0.03)" : "transparent",
                  transition: "all 0.15s ease-in-out",
                }}
              >
                <div style={{ color: opt.color, display: "flex", alignItems: "center" }}>
                  {opt.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ink, #0f172a)" }}>
                      {opt.label}
                    </strong>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "var(--border, #e2e8f0)",
                        color: "var(--ink, #334155)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {opt.ext}
                    </span>
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#2563eb",
                          background: "#eff6ff",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          marginLeft: "auto",
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "11.5px",
                      color: "var(--muted, #64748b)",
                      lineHeight: "1.4",
                    }}
                  >
                    {opt.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            className="outline-button"
            onClick={onClose}
            disabled={isExporting}
            style={{ padding: "8px 16px" }}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={handleDownload}
            disabled={isExporting}
            style={{ padding: "8px 20px" }}
          >
            {isExporting ? (
              <>
                <RefreshCw size={15} className="spin" /> Generating Deliverable...
              </>
            ) : (
              <>
                <Download size={15} /> Download {selectedFormat.toUpperCase()} Package
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

