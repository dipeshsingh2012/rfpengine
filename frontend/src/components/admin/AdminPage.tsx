import React, { useState } from "react";
import { Settings, Loader2 } from "lucide-react";
import { useAdminManager } from "../../hooks/useAdminManager";
import { AdminTabsNav } from "./AdminTabsNav";
import { AdminTeamTab } from "./tabs/AdminTeamTab";
import { AdminGovernanceTab } from "./tabs/AdminGovernanceTab";
import { AdminAiTab } from "./tabs/AdminAiTab";
import { AdminSecurityTab } from "./tabs/AdminSecurityTab";
import { AdminDataAuditTab } from "./tabs/AdminDataAuditTab";
import { SettingsProfileTab } from "../modals/workspace-settings/SettingsProfileTab";
import { DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettings } from "../../types";

interface AdminPageProps {
  tenantId: string;
  showToast?: (msg: string) => void;
  onExport?: () => void;
  workspaceSettings?: WorkspaceSettings;
  setWorkspaceSettings?: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onSaveWorkspaceSettings?: (updates?: Partial<WorkspaceSettings>) => Promise<void>;
  kbRecordsCount?: number;
  kbDocumentsCount?: number;
  recentRfpsCount?: number;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  tenantId,
  showToast,
  onExport,
  workspaceSettings,
  setWorkspaceSettings,
  onSaveWorkspaceSettings,
  kbRecordsCount = 0,
  kbDocumentsCount = 0,
  recentRfpsCount = 0,
}) => {
  const admin = useAdminManager(tenantId, showToast);
  const [localSettings, setLocalSettings] = useState<WorkspaceSettings>(workspaceSettings || DEFAULT_WORKSPACE_SETTINGS);
  const activeSettings = workspaceSettings || localSettings;
  const updateSettings = setWorkspaceSettings || setLocalSettings;

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-title-row">
          <div className="admin-title-badge">
            <Settings size={22} color="var(--blue, #3b82f6)" />
            <h2>Settings & Administration</h2>
          </div>
          <span className="tenant-id-tag">Tenant: {tenantId}</span>
        </div>
        <AdminTabsNav currentTab={admin.activeTab} onSelectTab={admin.setActiveTab} />
      </header>

      <main className="admin-page-main">
        {admin.isLoading ? (
          <div className="admin-loading-state">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading admin directory...</span>
          </div>
        ) : (
          <>
            {admin.activeTab === "profile" && (
              <div className="admin-tab-content">
                <SettingsProfileTab settings={activeSettings} setSettings={updateSettings} />
              </div>
            )}
            {admin.activeTab === "team" && (
              <AdminTeamTab
                members={admin.members}
                roles={admin.roles}
                isCreateRoleOpen={admin.isCreateRoleOpen}
                setIsCreateRoleOpen={admin.setIsCreateRoleOpen}
                reassignMemberRole={admin.reassignMemberRole}
                createRole={admin.createRole}
              />
            )}
            {admin.activeTab === "governance" && (
              <AdminGovernanceTab
                governance={admin.governance}
                onSave={admin.saveGovernance}
                saveNotice={admin.saveNotice}
              />
            )}
            {admin.activeTab === "ai" && (
              <AdminAiTab
                governance={admin.governance}
                onSave={admin.saveGovernance}
                settings={activeSettings}
                setSettings={updateSettings}
              />
            )}
            {admin.activeTab === "security" && (
              <AdminSecurityTab governance={admin.governance} onSave={admin.saveGovernance} />
            )}
            {admin.activeTab === "data" && (
              <AdminDataAuditTab
                tenantId={tenantId}
                onExport={onExport}
                kbRecordsCount={kbRecordsCount}
                kbDocumentsCount={kbDocumentsCount}
                recentRfpsCount={recentRfpsCount}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

