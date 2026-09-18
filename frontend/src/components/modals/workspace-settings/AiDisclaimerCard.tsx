import React from "react";
import { Sliders } from "lucide-react";
import { WorkspaceSettings } from "../../../types";

interface AiDisclaimerCardProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const AiDisclaimerCard: React.FC<AiDisclaimerCardProps> = ({ settings, setSettings }) => (
  <div className="settings-group-card">
    <div>
      <div className="settings-group-title">
        <Sliders size={16} color="var(--navy)" /> Default Legal Disclaimer
      </div>
      <p className="settings-group-subtitle">
        Standard legal confidentiality statement appended to exported RFP response packages.
      </p>
    </div>
    <div className="settings-field">
      <textarea
        rows={3}
        value={settings.disclaimer}
        onChange={(e) => setSettings({ ...settings, disclaimer: e.target.value })}
        placeholder="CONFIDENTIAL: The information provided herein is proprietary..."
      />
      <span className="settings-field-hint">
        Included in exported Word, Excel, and JSON questionnaire deliverables.
      </span>
    </div>
  </div>
);

