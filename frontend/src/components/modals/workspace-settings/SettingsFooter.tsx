import React from "react";
import { Save } from "lucide-react";

interface SettingsFooterProps {
  saveNotice: string | null;
  tenantId: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export const SettingsFooter: React.FC<SettingsFooterProps> = ({
  saveNotice,
  tenantId,
  isSaving,
  onClose,
  onSave,
}) => {
  return (
    <div className="settings-modal-footer">
      <div className="settings-footer-status">
        {saveNotice ? (
          <span
            style={{
              color:
                saveNotice.includes("Error") || saveNotice.includes("Failed")
                  ? "#b91c1c"
                  : "#15803d",
              fontWeight: 600,
            }}
          >
            {saveNotice}
          </span>
        ) : (
          <span>Tenant: {tenantId} • PostgreSQL Connected</span>
        )}
      </div>
      <div className="settings-footer-actions">
        <button className="secondary-button" onClick={onClose}>
          Close
        </button>
        <button
          className="primary-button"
          onClick={() => onSave()}
          disabled={isSaving}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Save size={14} />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

