import React from "react";
import { Plus, Users } from "lucide-react";
import { AdminMember, AdminRole } from "../../../types";
import { AdminMembersTable } from "./team/AdminMembersTable";
import { AdminPermissionsMatrix } from "./team/AdminPermissionsMatrix";
import { AdminCreateRoleModal } from "./team/AdminCreateRoleModal";

interface AdminTeamTabProps {
  members: AdminMember[];
  roles: AdminRole[];
  isCreateRoleOpen: boolean;
  setIsCreateRoleOpen: (open: boolean) => void;
  reassignMemberRole: (memberId: string, newRole: string) => void;
  createRole: (payload: any) => void;
}

export const AdminTeamTab: React.FC<AdminTeamTabProps> = ({
  members,
  roles,
  isCreateRoleOpen,
  setIsCreateRoleOpen,
  reassignMemberRole,
  createRole,
}) => {
  const ssoCount = members.filter((m) => m.is_google_sso).length;

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-section-title">Team Members & Role-Based Access</h3>
          <p className="admin-section-desc">
            Manage organization members, auto-discovered SSO users, and customize granular permissions.
          </p>
        </div>
        <div className="admin-header-actions">
          <div className="admin-stat-pill">
            <Users size={14} />
            <span>{members.length} Members ({ssoCount} via SSO)</span>
          </div>
          <button className="primary-btn sm-btn" onClick={() => setIsCreateRoleOpen(true)}>
            <Plus size={14} />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      <div className="admin-tab-stack">
        <div className="admin-card">
          <div className="admin-card-header">
            <h4 className="card-title">Enrolled Team Members</h4>
            <span className="card-hint">SSO logins auto-enrolled with default Proposal Drafter role</span>
          </div>
          <AdminMembersTable
            members={members}
            roles={roles}
            onReassignRole={reassignMemberRole}
          />
        </div>

        <AdminPermissionsMatrix roles={roles} />
      </div>

      {isCreateRoleOpen && (
        <AdminCreateRoleModal
          isOpen={isCreateRoleOpen}
          onClose={() => setIsCreateRoleOpen(false)}
          onCreateRole={createRole}
        />
      )}
    </div>
  );
};
