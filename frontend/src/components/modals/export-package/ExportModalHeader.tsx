import React from "react";
import { X } from "lucide-react";

interface ExportModalHeaderProps {
  onClose: () => void;
}

export const ExportModalHeader: React.FC<ExportModalHeaderProps> = ({ onClose }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
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
);

