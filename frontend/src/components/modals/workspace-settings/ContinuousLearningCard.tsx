import React from "react";
import { Sparkles } from "lucide-react";
import { WorkspaceSettings } from "../../../types";

interface ContinuousLearningCardProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const ContinuousLearningCard: React.FC<ContinuousLearningCardProps> = ({
  settings,
  setSettings,
}) => (
  <div className="settings-group-card">
    <div>
      <div className="settings-group-title">
        <Sparkles size={16} color="#d97706" /> Continuous Learning & Golden Q&A
      </div>
      <p className="settings-group-subtitle">
        Control how finalized answers flow back into the company knowledge graph.
      </p>
    </div>

    <div className="settings-toggle-box">
      <div className="settings-toggle-info">
        <strong>Auto-promote 100% Approved Responses to Knowledge Base</strong>
        <small>
          When active, answers given full 5-star or verified human approval automatically index into the tenant's vector collection for future RFPs.
        </small>
      </div>
      <label className="settings-switch">
        <input
          type="checkbox"
          checked={settings.auto_promote_golden_qa}
          onChange={(e) => setSettings({ ...settings, auto_promote_golden_qa: e.target.checked })}
        />
        <span className="settings-slider-thumb" />
      </label>
    </div>
  </div>
);

