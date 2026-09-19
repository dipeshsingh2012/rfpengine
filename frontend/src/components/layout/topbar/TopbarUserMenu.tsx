import React, { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { GoogleUser, ReviewerRole } from "../../../types";

interface TopbarUserMenuProps {
  user: GoogleUser | null;
  onLogout: () => void;
  role: ReviewerRole;
  googleClientId?: string;
  onCredentialSuccess?: (res: { credential: string }) => void;
}

export const TopbarUserMenu: React.FC<TopbarUserMenuProps> = ({
  user,
  onLogout,
  role,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const initials = user.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "JD";

  return (
    <div className="topbar-user-menu">
      <button className="avatar" onClick={() => setIsOpen(!isOpen)} title={`${user.name} (${user.email})`}>
        {user.picture ? <img src={user.picture} alt={user.name} className="avatar-img" /> : initials}
      </button>
      {isOpen && (
        <div className="user-menu-popover panel">
          <div className="user-menu-header">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <div className="user-menu-meta">
            <span className="stat-badge approved"><ShieldCheck size={12} /> Google SSO</span>
            <span className="stat-badge review">{role}</span>
          </div>
          <button className="user-menu-logout" onClick={() => { setIsOpen(false); onLogout(); }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
