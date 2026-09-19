import React from "react";
import { GitCommit, Shuffle, GitMerge, Check } from "lucide-react";
import { AdminGovernanceSettings } from "../../../types";

interface AdminGovernanceTabProps {
  governance: AdminGovernanceSettings;
  onSave: (updates: Partial<AdminGovernanceSettings>) => void;
  saveNotice: string | null;
}

const MODES: Array<{ id: "waterfall" | "parallel" | "hybrid"; title: string; icon: React.ReactNode; desc: string }> = [
  { id: "waterfall", title: "Strict Waterfall", icon: <GitCommit size={18} />, desc: "Sequential stage gating: Drafting → Security SME → Legal Review → Executive Sign-Off." },
  { id: "parallel", title: "Parallel Multi-SME", icon: <Shuffle size={18} />, desc: "All SME roles review sections concurrently without sequential blocking." },
  { id: "hybrid", title: "Hybrid Routing", icon: <GitMerge size={18} />, desc: "Ad-hoc SME dispatch based on section tags, with mandatory final sign-off." },
];

export const AdminGovernanceTab: React.FC<AdminGovernanceTabProps> = ({ governance, onSave, saveNotice }) => {
  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-section-title">Workflow & Governance Model</h3>
          <p className="admin-section-desc">Configure how proposals flow through your organization and assign default SME reviewers.</p>
        </div>
        {saveNotice && <div className="save-indicator"><Check size={14} /> {saveNotice}</div>}
      </div>

      <div className="admin-card">
        <h4 className="card-title">Tenant Workflow Architecture</h4>
        <div className="workflow-mode-grid">
          {MODES.map((m) => {
            const isSelected = governance.workflow_mode === m.id;
            return (
              <div key={m.id} className={`workflow-mode-card ${isSelected ? "selected" : ""}`} onClick={() => onSave({ workflow_mode: m.id })}>
                <div className="mode-card-header">
                  <div className="mode-icon-box">{m.icon}</div>
                  <span className="mode-title">{m.title}</span>
                </div>
                <p className="mode-desc">{m.desc}</p>
                {isSelected && <span className="mode-badge-active">Active Engine</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-card">
        <h4 className="card-title">SME Notification & Routing Defaults</h4>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="input-label">Security SME Team Email</label>
            <input
              type="email"
              className="text-input"
              value={governance.security_sme_email || ""}
              onChange={(e) => onSave({ security_sme_email: e.target.value })}
              placeholder="infosec@yourcorp.com"
            />
          </div>
          <div className="form-group">
            <label className="input-label">Legal Reviewer Team Email</label>
            <input
              type="email"
              className="text-input"
              value={governance.legal_reviewer_email || ""}
              onChange={(e) => onSave({ legal_reviewer_email: e.target.value })}
              placeholder="legal@yourcorp.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

