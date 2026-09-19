import React from "react";
import { Check, Minus } from "lucide-react";
import { AdminRole } from "../../../../types";

interface AdminPermissionsMatrixProps {
  roles: AdminRole[];
}

const PERMISSIONS = [
  { key: "create_rfp", label: "Create RFPs & Upload Specs" },
  { key: "edit_draft", label: "Edit Draft Sections & Answers" },
  { key: "ai_generate", label: "Trigger AI Synthesizer" },
  { key: "stage_advance", label: "Sign-Off & Advance Stage" },
  { key: "manage_kb", label: "Curate Knowledge Base" },
  { key: "reset_data", label: "Reset Partition / Export Data" },
];

export const AdminPermissionsMatrix: React.FC<AdminPermissionsMatrixProps> = ({ roles }) => {
  return (
    <div className="permissions-matrix-card">
      <div className="permissions-matrix-header">
        <h4 className="matrix-title">Role Capabilities Matrix</h4>
        <span className="matrix-subtitle">Effective permissions per organizational role</span>
      </div>
      <div className="permissions-table-container">
        <table className="permissions-table">
          <thead>
            <tr>
              <th className="perm-capability-col">Capability</th>
              {roles.map((r) => (
                <th key={r.id} className="perm-role-col">
                  <span className="role-matrix-icon">{r.icon}</span>
                  <span className="role-matrix-name">{r.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.key}>
                <td className="perm-label-cell">{p.label}</td>
                {roles.map((r) => {
                  const hasPerm = !!r.permissions?.[p.key];
                  return (
                    <td key={r.id} className="perm-status-cell">
                      {hasPerm ? (
                        <span className="perm-badge-allowed" title="Allowed">
                          <Check size={14} />
                        </span>
                      ) : (
                        <span className="perm-badge-denied" title="Restricted">
                          <Minus size={14} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

