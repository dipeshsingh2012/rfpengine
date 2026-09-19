import React from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { GoogleUser, ReviewerRole } from "../../../types";
import { TopbarRoleSelector } from "./TopbarRoleSelector";
import { TopbarUserMenu } from "./TopbarUserMenu";

interface TopbarActionsProps {
  role?: ReviewerRole;
  setRole?: (role: ReviewerRole) => void;
  showToast?: (msg: string) => void;
  user?: GoogleUser | null;
  onLogout?: () => void;
  googleClientId?: string;
  onCredentialSuccess?: (res: { credential: string }) => void;
}

export const TopbarActions: React.FC<TopbarActionsProps> = ({
  role = "Proposal manager",
  setRole = () => {},
  showToast,
  user = null,
  onLogout = () => {},
  googleClientId,
  onCredentialSuccess = () => {},
}) => {
  return (
    <>
      <div className="topbar-spacer" />
      {user && <TopbarRoleSelector role={role} setRole={setRole} showToast={showToast} />}
      <a
        href="https://rfpengine.aroadmap.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="outline-button"
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#eef2ff",
          borderColor: "#c7d2fe",
          color: "var(--blue)",
          fontWeight: 700,
          textDecoration: "none",
        }}
        title="Open live strategy & PRD roadmap on aroadmap.dev"
      >
        <TrendingUp size={14} /> 🗺️ Roadmap
      </a>
      <button className="icon-button" title="Open notifications">
        <AlertCircle size={18} />
      </button>
      <TopbarUserMenu
        user={user}
        onLogout={onLogout}
        role={role}
        googleClientId={googleClientId}
        onCredentialSuccess={onCredentialSuccess}
      />
    </>
  );
};
