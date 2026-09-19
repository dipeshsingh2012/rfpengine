import React from "react";
import { Shield, Lock, Globe, Clock, CheckCircle } from "lucide-react";
import { AdminGovernanceSettings } from "../../../types";

interface AdminSecurityTabProps {
  governance: AdminGovernanceSettings;
  onSave: (updates: Partial<AdminGovernanceSettings>) => void;
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({ governance, onSave }) => {
  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-section-title">Security, Single Sign-On & Access Control</h3>
          <p className="admin-section-desc">
            Enforce domain restrictions, manage Google Identity SSO, and configure session policies.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <div className="security-sso-header">
          <div className="sso-provider-info">
            <div className="sso-badge-active">
              <CheckCircle size={14} /> Google Identity SSO Active
            </div>
            <span className="card-hint">OpenID Connect + OAuth2.0 Token Verification</span>
          </div>
        </div>

        <div className="form-grid-2" style={{ marginTop: "16px" }}>
          <div className="form-group">
            <label className="input-label">
              <Globe size={14} /> Allowed Corporate Domains (Comma-separated)
            </label>
            <input
              type="text"
              className="text-input"
              value={governance.allowed_domains || ""}
              onChange={(e) => onSave({ allowed_domains: e.target.value })}
              placeholder="e.g. acme-corp.com, partner.io"
            />
            <span className="input-hint">Users with these email domains are auto-enrolled on first Google login.</span>
          </div>

          <div className="form-group">
            <label className="input-label">
              <Clock size={14} /> Session Inactivity Timeout (Minutes)
            </label>
            <input
              type="number"
              className="text-input"
              min={15}
              max={1440}
              value={governance.session_timeout_minutes || 120}
              onChange={(e) => onSave({ session_timeout_minutes: parseInt(e.target.value, 10) || 60 })}
            />
            <span className="input-hint">Default 120 minutes before requiring Google re-authentication.</span>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h4 className="card-title">
          <Lock size={15} /> Encryption & Compliance Standards
        </h4>
        <div className="compliance-pills-row">
          <span className="compliance-pill">AES-256 at Rest</span>
          <span className="compliance-pill">TLS 1.3 in Flight</span>
          <span className="compliance-pill">Multi-Tenant PostgreSQL RLS</span>
          <span className="compliance-pill">Immutable Audit Trail</span>
        </div>
      </div>
    </div>
  );
};

