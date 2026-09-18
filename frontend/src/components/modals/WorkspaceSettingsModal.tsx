import React from "react";
import { Settings, X } from "lucide-react";
import { WorkspaceSettings } from "../../types";
import { SettingsNavTabs, SettingsTabKey } from "./workspace-settings/SettingsNavTabs";
import { SettingsProfileTab } from "./workspace-settings/SettingsProfileTab";
import { SettingsAiTab } from "./workspace-settings/SettingsAiTab";
import { SettingsGovernanceTab } from "./workspace-settings/SettingsGovernanceTab";
import { SettingsDataTab } from "./workspace-settings/SettingsDataTab";
import { SettingsFooter } from "./workspace-settings/SettingsFooter";

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onSave: (updates?: Partial<WorkspaceSettings>) => Promise<void>;
  onExport: () => void;
  isSaving: boolean;
  saveNotice: string | null;
  tenantId: string;
  kbRecordsCount: number;
  kbDocumentsCount?: number;
  recentRfpsCount: number;
  settingsTab: SettingsTabKey;
  setSettingsTab: (tab: SettingsTabKey) => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onSave,
  onExport,
  isSaving,
  saveNotice,
  tenantId,
  kbRecordsCount,
  kbDocumentsCount = 0,
  recentRfpsCount,
  settingsTab,
  setSettingsTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="kb-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <Settings size={20} color="var(--navy)" />
            <h2 style={{ margin: 0 }}>Workspace Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings modal">
            <X size={20} />
          </button>
        </div>

        <SettingsNavTabs currentTab={settingsTab} onSelectTab={setSettingsTab} />

        <div className="settings-modal-body">
          {settingsTab === "profile" && (
            <SettingsProfileTab settings={settings} setSettings={setSettings} />
          )}

          {settingsTab === "ai" && (
            <SettingsAiTab settings={settings} setSettings={setSettings} />
          )}

          {settingsTab === "governance" && (
            <SettingsGovernanceTab settings={settings} setSettings={setSettings} />
          )}

          {settingsTab === "data" && (
            <SettingsDataTab
              settings={settings}
              setSettings={setSettings}
              onExport={onExport}
              tenantId={tenantId}
              kbRecordsCount={kbRecordsCount}
              kbDocumentsCount={kbDocumentsCount}
              recentRfpsCount={recentRfpsCount}
            />
          )}
        </div>

        <SettingsFooter
          saveNotice={saveNotice}
          tenantId={tenantId}
          isSaving={isSaving}
          onClose={onClose}
          onSave={() => onSave()}
        />
      </div>
    </div>
  );
};
