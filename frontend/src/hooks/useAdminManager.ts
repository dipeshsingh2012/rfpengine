import { useState, useEffect, useCallback } from "react";
import { AdminMember, AdminRole, AdminGovernanceSettings } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export type AdminTabKey = "profile" | "team" | "governance" | "ai" | "security" | "data";

export function useAdminManager(tenantId: string, showToast?: (msg: string) => void, enabled: boolean = true) {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("team");
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [governance, setGovernance] = useState<AdminGovernanceSettings>({
    workflow_mode: "waterfall",
    security_sme_email: "infosec@acme-corp.com",
    legal_reviewer_email: "legal-review@acme-corp.com",
    finance_sme_email: "pricing@acme-corp.com",
    auto_promote_golden_qa: true,
    continuous_learning_enabled: true,
    allowed_domains: "acme-corp.com",
    session_timeout_minutes: 120,
  });
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = { "X-Tenant-ID": tenantId };
      const [membersRes, rolesRes, govRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/admin/members`, { headers }).then((r) => r.ok ? r.json() : null),
        fetch(`${apiBaseUrl}/api/v1/admin/roles`, { headers }).then((r) => r.ok ? r.json() : null),
        fetch(`${apiBaseUrl}/api/v1/admin/governance`, { headers }).then((r) => r.ok ? r.json() : null),
      ]);
      if (membersRes?.members) setMembers(membersRes.members);
      if (rolesRes?.roles) setRoles(rolesRes.roles);
      if (govRes) setGovernance((prev) => ({ ...prev, ...govRes }));
    } catch {} finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!enabled) return;
    fetchAdminData();
  }, [fetchAdminData, enabled]);

  const reassignMemberRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/members/${memberId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to reassign role");
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
      showToast?.(`Reassigned role to ${newRole}`);
    } catch (err: any) {
      showToast?.(err.message || "Failed to update role");
    }
  };

  const createRole = async (payload: { name: string; icon: string; description: string; workflow_type: string; step_order?: number; permissions: Record<string, boolean> }) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error creating role" }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setRoles((prev) => [...prev, data.role]);
      setIsCreateRoleOpen(false);
      showToast?.(`Created custom role: ${payload.name}`);
    } catch (err: any) {
      showToast?.(err.message || "Could not create role");
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/roles/${roleId}`, {
        method: "DELETE",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (!res.ok) throw new Error("Cannot delete role");
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      showToast?.(`Deleted role ${roleId}`);
    } catch (err: any) {
      showToast?.(err.message || "Deletion failed");
    }
  };

  const saveGovernance = async (updates: Partial<AdminGovernanceSettings>) => {
    const next = { ...governance, ...updates };
    setGovernance(next);
    try {
      await fetch(`${apiBaseUrl}/api/v1/admin/governance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify(next),
      });
      setSaveNotice("Settings saved");
      setTimeout(() => setSaveNotice(null), 3000);
      showToast?.("Governance settings updated");
    } catch {
      showToast?.("Failed to save settings");
    }
  };

  return {
    activeTab,
    setActiveTab,
    members,
    roles,
    governance,
    isCreateRoleOpen,
    setIsCreateRoleOpen,
    isLoading,
    saveNotice,
    reassignMemberRole,
    createRole,
    deleteRole,
    saveGovernance,
  };
}

