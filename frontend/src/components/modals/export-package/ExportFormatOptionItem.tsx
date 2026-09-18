import React from "react";
import { ExportFormat } from "../ExportPackageModal";

export interface FormatOptionConfig {
  id: ExportFormat;
  label: string;
  ext: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface ExportFormatOptionItemProps {
  option: FormatOptionConfig;
  isSelected: boolean;
  onSelect: (id: ExportFormat) => void;
}

export const ExportFormatOptionItem: React.FC<ExportFormatOptionItemProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(option.id)}
      style={{
        border: isSelected ? "2px solid var(--accent, #2563eb)" : "1px solid var(--border, #e2e8f0)",
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
      <div style={{ color: option.color, display: "flex", alignItems: "center" }}>
        {option.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <strong style={{ fontSize: "14px", color: "var(--ink, #0f172a)" }}>
            {option.label}
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
            {option.ext}
          </span>
          {option.badge && (
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
              {option.badge}
            </span>
          )}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "var(--muted, #64748b)", lineHeight: "1.4" }}>
          {option.description}
        </p>
      </div>
    </div>
  );
};

