import React from "react";
import { ShieldCheck } from "lucide-react";
import { WorkspaceSettings } from "../../../types";
import { ContinuousLearningCard } from "./ContinuousLearningCard";

interface SettingsGovernanceTabProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const SettingsGovernanceTab: React.FC<SettingsGovernanceTabProps> = ({ settings, setSettings }) => {
  return (
    <>
      <div className="settings-group-card">
        <div>
          <div className="settings-group-title">
            <ShieldCheck size={16} color="var(--blue)" /> SME Reviewer Routing
          </div>
          <p className="settings-group-subtitle">
            Configure default Subject Matter Expert email routing for section triage and multi-stage compliance approvals.
          </p>
        </div>

        <div className="settings-grid-2">
          <div className="settings-field">
            <label>Security & Infrastructure SME</label>
            <input
              type="email"
              value={settings.sme_roles_config?.security_sme_email || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sme_roles_config: {
                    ...settings.sme_roles_config,
                    security_sme_email: e.target.value,
                  },
                })
              }
              placeholder="e.g. infosec@company.com"
            />
            <span className="settings-field-hint">Routes questions tagged #Security or #Infra</span>
          </div>

          <div className="settings-field">
            <label>Legal & Compliance SME</label>
            <input
              type="email"
              value={settings.sme_roles_config?.legal_reviewer_email || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sme_roles_config: {
                    ...settings.sme_roles_config,
                    legal_reviewer_email: e.target.value,
                  },
                })
              }
              placeholder="e.g. legal-review@company.com"
            />
            <span className="settings-field-hint">Routes questions tagged #Legal or #Compliance</span>
          </div>
        </div>

        <div className="settings-field">
          <label>Final Authority Approver</label>
          <input
            type="email"
            value={settings.sme_roles_config?.final_approver_email || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                sme_roles_config: {
                  ...settings.sme_roles_config,
                  final_approver_email: e.target.value,
                },
              })
            }
            placeholder="e.g. vp-compliance@company.com"
          />
          <span className="settings-field-hint">Authorizes final release lock before export</span>
        </div>
      </div>

      <ContinuousLearningCard settings={settings} setSettings={setSettings} />
    </>
  );
};

