import React from "react";
import { Database, Download } from "lucide-react";
import { WorkspaceSettings } from "../../../types";
import { DataResetDangerZone } from "./DataResetDangerZone";

interface SettingsDataTabProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onExport: () => void;
  tenantId: string;
  kbRecordsCount: number;
  kbDocumentsCount: number;
  recentRfpsCount: number;
}

export const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  settings,
  setSettings,
  onExport,
  tenantId,
  kbRecordsCount,
  kbDocumentsCount,
  recentRfpsCount,
}) => {
  return (
    <>
      <div className="settings-group-card">
        <div>
          <div className="settings-group-title">
            <Database size={16} color="var(--blue)" /> Workspace Snapshot & Metrics
          </div>
          <p className="settings-group-subtitle">
            Overview of tenant-partitioned storage resources and records in PostgreSQL.
          </p>
        </div>

        <div className="activity-stats-bar" style={{ display: "flex", gap: "12px", margin: "4px 0" }}>
          <div style={{ flex: 1, background: "#f8fafc", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <span className="eyebrow" style={{ color: "var(--muted)" }}>Tenant ID</span>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace" }}>
              {settings.tenant_id}
            </div>
          </div>
          <div style={{ flex: 1, background: "#f0fdf4", padding: "12px 14px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
            <span className="eyebrow" style={{ color: "#166534" }}>Indexed KB Records</span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#15803d" }}>
              {kbRecordsCount}
            </div>
          </div>
          <div style={{ flex: 1, background: "#f5f3ff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #ddd6fe" }}>
            <span className="eyebrow" style={{ color: "#6d28d9" }}>Indexed Documents</span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#7c3aed" }}>
              {kbDocumentsCount}
            </div>
          </div>
          <div style={{ flex: 1, background: "#eff6ff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
            <span className="eyebrow" style={{ color: "#1e40af" }}>Recent Questionnaires</span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1d4ed8" }}>
              {recentRfpsCount}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group-card">
        <div>
          <div className="settings-group-title">
            <Download size={16} color="var(--navy)" /> Tenant Data Portability
          </div>
          <p className="settings-group-subtitle">
            Download a complete JSON archive of this workspace, including configuration, recent questionnaire outputs, and indexed knowledge base pairs.
          </p>
        </div>
        <div>
          <button
            className="secondary-button"
            onClick={onExport}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Download size={15} /> Download Workspace Archive (.json)
          </button>
        </div>
      </div>

      <DataResetDangerZone tenantId={tenantId} setSettings={setSettings} />
    </>
  );
};

