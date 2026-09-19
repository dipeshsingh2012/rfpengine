import React from "react";
import { ShieldCheck, User } from "lucide-react";
import { AdminMember, AdminRole } from "../../../../types";

interface AdminMembersTableProps {
  members: AdminMember[];
  roles: AdminRole[];
  onReassignRole: (memberId: string, role: string) => void;
}

export const AdminMembersTable: React.FC<AdminMembersTableProps> = ({
  members,
  roles,
  onReassignRole,
}) => {
  return (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Team Member</th>
            <th>Email</th>
            <th>Authentication</th>
            <th>Assigned Role</th>
            <th>Last Active</th>
          </tr>
        </thead>
        <tbody>
          {members.map((mem) => (
            <tr key={mem.id}>
              <td>
                <div className="member-cell">
                  {mem.picture ? (
                    <img src={mem.picture} alt={mem.name} className="member-avatar" />
                  ) : (
                    <div className="member-avatar placeholder">
                      <User size={13} />
                    </div>
                  )}
                  <div className="member-info">
                    <strong>{mem.name}</strong>
                  </div>
                </div>
              </td>
              <td>{mem.email}</td>
              <td>
                {mem.is_google_sso ? (
                  <span className="stat-badge approved">
                    <ShieldCheck size={12} /> Google SSO
                  </span>
                ) : (
                  <span className="stat-badge review">Directory</span>
                )}
              </td>
              <td>
                <select
                  className="role-select"
                  value={mem.role}
                  onChange={(e) => onReassignRole(mem.id, e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon} {r.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <span style={{ color: "var(--muted)", fontSize: "11px" }}>{mem.last_active}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

