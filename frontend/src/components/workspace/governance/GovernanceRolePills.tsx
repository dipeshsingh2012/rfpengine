import React from "react";
import { ReviewerRole } from "../../../types";

interface GovernanceRolePillsProps {
  role: ReviewerRole;
  setRole: (role: ReviewerRole) => void;
  showToast: (msg: string) => void;
}

const ROLES: Array<{ id: ReviewerRole; label: string; toast: string }> = [
  { id: "Proposal manager", label: "🧑‍💻 Proposal Drafter", toast: "Active Role: Proposal Drafter" },
  { id: "Security SME", label: "🛡️ Security SME", toast: "Active Role: Security SME" },
  { id: "Legal reviewer", label: "⚖️ Legal Reviewer", toast: "Active Role: Legal Reviewer" },
  { id: "Final approver", label: "👑 Final Approver", toast: "Active Role: Final Approver" },
];

export const GovernanceRolePills: React.FC<GovernanceRolePillsProps> = ({
  role,
  setRole,
  showToast,
}) => {
  return (
    <div className="governance-role-select">
      <span className="eyebrow">Acting Role:</span>
      <div className="role-pills">
        {ROLES.map(({ id, label, toast }) => (
          <button
            key={id}
            className={`role-pill ${role === id ? "active" : ""}`}
            onClick={() => {
              setRole(id);
              showToast(toast);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

