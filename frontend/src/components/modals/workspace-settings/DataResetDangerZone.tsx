import React from "react";
import { AlertCircle } from "lucide-react";
import { WorkspaceSettings, DEFAULT_WORKSPACE_SETTINGS } from "../../../types";

interface DataResetDangerZoneProps {
  tenantId: string;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const DataResetDangerZone: React.FC<DataResetDangerZoneProps> = ({ tenantId, setSettings }) => (
  <div className="settings-group-card danger-zone">
    <div>
      <div className="settings-group-title" style={{ color: "#b91c1c" }}>
        <AlertCircle size={16} color="#b91c1c" /> Reset Workspace Configuration
      </div>
      <p className="settings-group-subtitle" style={{ color: "#7f1d1d" }}>
        Restore default system settings for tone, model, and SME assignments. This does not erase indexed knowledge base entries.
      </p>
    </div>
    <div>
      <button
        className="secondary-button"
        style={{ color: "#b91c1c", borderColor: "#fca5a5", background: "#fff" }}
        onClick={() => setSettings({ ...DEFAULT_WORKSPACE_SETTINGS, tenant_id: tenantId })}
      >
        Reset to Defaults
      </button>
    </div>
  </div>
);

