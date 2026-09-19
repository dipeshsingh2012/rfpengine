import React from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useAdminManager } from "../../hooks/useAdminManager";
import { AdminTabsNav } from "./AdminTabsNav";
import { AdminTeamTab } from "./tabs/AdminTeamTab";
import { AdminGovernanceTab } from "./tabs/AdminGovernanceTab";
import { AdminAiTab } from "./tabs/AdminAiTab";
import { AdminSecurityTab } from "./tabs/AdminSecurityTab";
import { AdminDataAuditTab } from "./tabs/AdminDataAuditTab";

interface AdminPageProps {
  tenantId: string;
  showToast?: (msg: string) => void;
  onExport?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ tenantId, showToast, onExport }) => {
  const admin = useAdminManager(tenantId, showToast);

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-title-row">
          <div className="admin-title-badge">
            <ShieldCheck size={22} color="var(--blue, #3b82f6)" />
            <h2>Enterprise Administration</h2>
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
              <AdminAiTab governance={admin.governance} onSave={admin.saveGovernance} />
            )}
            {admin.activeTab === "security" && (
              <AdminSecurityTab governance={admin.governance} onSave={admin.saveGovernance} />
            )}
            {admin.activeTab === "data" && (
              <AdminDataAuditTab tenantId={tenantId} onExport={onExport} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

