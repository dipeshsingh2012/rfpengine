import React from "react";
import { Database, X } from "lucide-react";

interface KBModalHeaderProps {
  tenantId: string;
  kbTotalRecords?: number;
  kbTotalSources?: number;
  onClose: () => void;
}

export const KBModalHeader: React.FC<KBModalHeaderProps> = ({
  tenantId,
  kbTotalRecords,
  kbTotalSources,
  onClose,
}) => {
  return (
    <div className="kb-modal-header">
      <div className="kb-header-title">
        <Database size={20} color="var(--navy)" />
        <h2 style={{ margin: 0 }}>Grounding Knowledge Base</h2>
        <span
          style={{
            fontSize: "11px",
            background: "var(--cream)",
            padding: "2px 8px",
            borderRadius: "4px",
            color: "var(--ink)",
            fontWeight: 600,
          }}
        >
          Tenant: {tenantId}
        </span>
        {typeof kbTotalRecords === "number" && (
          <span
            style={{
              fontSize: "11px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "2px 8px",
              borderRadius: "4px",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            {kbTotalRecords} Records ({kbTotalSources || 0} Docs)
          </span>
        )}
      </div>
      <button className="icon-button" onClick={onClose} aria-label="Close modal">
        <X size={20} />
      </button>
    </div>
  );
};

