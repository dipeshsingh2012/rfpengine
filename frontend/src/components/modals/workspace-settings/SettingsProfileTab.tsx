import React from "react";
import { Building2, FileText } from "lucide-react";
import { WorkspaceSettings } from "../../../types";

interface SettingsProfileTabProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const SettingsProfileTab: React.FC<SettingsProfileTabProps> = ({ settings, setSettings }) => {
  return (
    <>
      <div className="settings-group-card">
        <div>
          <div className="settings-group-title">
            <Building2 size={16} color="var(--blue)" /> Organization Identity
          </div>
          <p className="settings-group-subtitle">
            Configure baseline tenant profile information and administrator contact details.
          </p>
        </div>

        <div className="settings-grid-2">
          <div className="settings-field">
            <label>Company Name</label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="e.g. Acme Corporation"
            />
          </div>
          <div className="settings-field">
            <label>Industry / Vertical</label>
            <input
              type="text"
              value={settings.industry}
              onChange={(e) => setSettings({ ...settings, industry: e.target.value })}
              placeholder="e.g. Enterprise Cloud & SaaS"
            />
          </div>
        </div>

        <div className="settings-grid-2">
          <div className="settings-field">
            <label>Tenant ID (Immutable)</label>
            <input
              type="text"
              value={settings.tenant_id}
              disabled
              style={{ opacity: 0.7, cursor: "not-allowed", background: "#f1f5f9" }}
            />
            <span className="settings-field-hint">
              Tenant isolation scope for PostgreSQL and vector collections
            </span>
          </div>
          <div className="settings-field">
            <label>Admin Notification Email</label>
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              placeholder="e.g. admin@company.com"
            />
            <span className="settings-field-hint">
              Primary recipient for compliance alerts and export notifications
            </span>
          </div>
        </div>
      </div>

      <div className="settings-group-card">
        <div>
          <div className="settings-group-title">
            <FileText size={16} color="var(--navy)" /> Company Context & Grounding Facts
          </div>
          <p className="settings-group-subtitle">
            Provide background on security certifications (SOC 2 Type II, ISO 27001), infrastructure hosting, data privacy commitments, and standard product terminology. This context grounds every answer formulation.
          </p>
        </div>

        <div className="settings-field">
          <textarea
            rows={4}
            value={settings.company_context}
            onChange={(e) => setSettings({ ...settings, company_context: e.target.value })}
            placeholder="e.g. Acme Corp provides an enterprise AI platform hosted in AWS us-east-1 and eu-central-1. All customer data is encrypted at rest (AES-256) and in transit (TLS 1.3). We hold SOC 2 Type II, ISO 27001, and HIPAA compliance certifications."
          />
          <span className="settings-field-hint">
            Injected into system instructions for high-fidelity compliance grounding.
          </span>
        </div>
      </div>
    </>
  );
};

