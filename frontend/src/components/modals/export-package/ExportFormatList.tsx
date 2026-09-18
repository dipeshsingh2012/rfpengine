import React from "react";
import { FileSpreadsheet, FileText, ShieldCheck, FileCode } from "lucide-react";
import { ExportFormat } from "../ExportPackageModal";
import { ExportFormatOptionItem, FormatOptionConfig } from "./ExportFormatOptionItem";

const FORMAT_OPTIONS: FormatOptionConfig[] = [
  {
    id: "xlsx",
    label: "Excel Compliance Matrix",
    ext: ".xlsx",
    badge: "Most Popular",
    description: "Two-sheet styled workbook with auto-filters, SME status color codes, and Audit Trail & Citations summary.",
    icon: <FileSpreadsheet size={24} />,
    color: "var(--accent, #2563eb)",
  },
  {
    id: "docx",
    label: "Word Executive Document",
    ext: ".docx",
    badge: "Audit Ready",
    description: "Formal submission package with executive cover metadata, Q&A blocks, SME verification stamps, and citation appendix.",
    icon: <FileText size={24} />,
    color: "#0284c7",
  },
  {
    id: "pdf",
    label: "PDF Compliance Report",
    ext: ".pdf",
    badge: "Print / Sign",
    description: "Audit-stamped deliverable with governance metrics table, verified evidence citations, and cryptographic footer.",
    icon: <ShieldCheck size={24} />,
    color: "#dc2626",
  },
  {
    id: "csv",
    label: "Raw CSV Spreadsheet",
    ext: ".csv",
    badge: "Data Import",
    description: "Standard UTF-8 comma-separated file for automated ingestion into external CRM or procurement portals.",
    icon: <FileCode size={24} />,
    color: "#475569",
  },
];

interface ExportFormatListProps {
  selectedFormat: ExportFormat;
  onSelectFormat: (format: ExportFormat) => void;
}

export const ExportFormatList: React.FC<ExportFormatListProps> = ({
  selectedFormat,
  onSelectFormat,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
      {FORMAT_OPTIONS.map((opt) => (
        <ExportFormatOptionItem
          key={opt.id}
          option={opt}
          isSelected={selectedFormat === opt.id}
          onSelect={onSelectFormat}
        />
      ))}
    </div>
  );
};

