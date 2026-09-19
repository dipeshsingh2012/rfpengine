import React, { useState } from "react";
import { Database, Download, AlertTriangle, Trash2 } from "lucide-react";
import { getApiBaseUrl } from "../../../utils/helpers";

interface AdminDataAuditTabProps {
  tenantId: string;
  onExport?: () => void;
}

export const AdminDataAuditTab: React.FC<AdminDataAuditTabProps> = ({ tenantId, onExport }) => {
  const [resetting, setResetting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    if (confirmText !== tenantId) return;
    setResetting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/workspace/danger-zone-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      setResetting(false);
    }
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-section-title">Data Storage, Export & Danger Zone</h3>
          <p className="admin-section-desc">
            Audit tenant-isolated database volumes, download full JSON archives, and manage data life cycles.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <h4 className="card-title">Tenant Data Portability</h4>
        <p className="card-hint">
          Download a complete machine-readable JSON archive containing all indexed vector pairs, proposal drafts, and governance audit records.
        </p>
        <div style={{ marginTop: "12px" }}>
          <button className="secondary-btn" onClick={onExport}>
            <Download size={15} />
            <span>Download Tenant Archive (.json)</span>
          </button>
        </div>
      </div>

      <div className="admin-card danger-zone-card">
        <div className="danger-zone-header">
          <AlertTriangle size={18} color="var(--coral)" />
          <h4 className="card-title text-danger">Tenant Partition Reset</h4>
        </div>
        <p className="card-hint">
          Permanently delete all indexed documents and RFPs for partition <code>{tenantId}</code>. Type the tenant ID below to confirm.
        </p>
        <div className="danger-zone-form">
          <input
            type="text"
            className="text-input danger-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type "${tenantId}" to confirm`}
          />
          <button
            className="danger-btn"
            disabled={confirmText !== tenantId || resetting}
            onClick={handleReset}
          >
            <Trash2 size={14} />
            <span>{resetting ? "Resetting..." : "Reset Partition"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
