import React from "react";
import { UserCheck, ChevronDown } from "lucide-react";
import { ReviewerRole } from "../../../types";

interface TopbarRoleSelectorProps {
  role: ReviewerRole;
  setRole: (role: ReviewerRole) => void;
  showToast?: (msg: string) => void;
}

const ROLES: Array<{ id: ReviewerRole; label: string; short: string }> = [
  { id: "Proposal manager", label: "🧑‍💻 Proposal Drafter", short: "Drafter" },
  { id: "Security SME", label: "🛡️ Security SME", short: "Security" },
  { id: "Legal reviewer", label: "⚖️ Legal Reviewer", short: "Legal" },
  { id: "Final approver", label: "👑 Final Approver", short: "Approver" },
];

export const TopbarRoleSelector: React.FC<TopbarRoleSelectorProps> = ({
  role,
  setRole,
  showToast,
}) => {
  const current = ROLES.find((r) => r.id === role) || ROLES[0];

  return (
    <div className="topbar-role-selector" style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <label
        htmlFor="topbar-role-select"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--navy)",
          cursor: "pointer",
        }}
        title="Switch acting persona for waterfall governance"
      >
        <UserCheck size={14} style={{ color: "var(--blue)" }} />
        <span>{current.label}</span>
        <ChevronDown size={13} style={{ opacity: 0.6 }} />
        <select
          id="topbar-role-select"
          value={role}
          onChange={(e) => {
            const next = e.target.value as ReviewerRole;
            setRole(next);
            showToast?.(`Acting Role: ${next === "Proposal manager" ? "Proposal Drafter" : next}`);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

