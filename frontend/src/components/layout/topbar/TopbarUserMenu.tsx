import React, { useState, useEffect, useRef } from "react";
import { LogOut, ShieldCheck, User } from "lucide-react";
import { GoogleUser, ReviewerRole } from "../../../types";

interface TopbarUserMenuProps {
  user: GoogleUser | null;
  onLogout: () => void;
  role: ReviewerRole;
  googleClientId?: string;
  onCredentialSuccess: (res: { credential: string }) => void;
}

export const TopbarUserMenu: React.FC<TopbarUserMenuProps> = ({
  user,
  onLogout,
  role,
  googleClientId,
  onCredentialSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user || !googleClientId) return;
    let timer: any = null;
    const tryInit = () => {
      if (window.google?.accounts?.id && btnRef.current) {
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: onCredentialSuccess });
        window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "medium", shape: "pill", text: "signin_with" });
        setRendered(true);
        if (timer) clearInterval(timer);
        return true;
      }
      return false;
    };
    if (!tryInit()) timer = setInterval(tryInit, 200);
    return () => { if (timer) clearInterval(timer); };
  }, [user, googleClientId, onCredentialSuccess]);

  const handleManualClick = () => {
    if (window.google?.accounts?.id && googleClientId) {
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: onCredentialSuccess });
      window.google.accounts.id.prompt();
    }
  };

  if (!user) {
    return (
      <div className="topbar-user-menu">
        <div ref={btnRef} style={{ display: rendered ? "block" : "none" }} />
        {!rendered && (
          <button className="google-signin-btn" onClick={handleManualClick} title="Sign in with Google">
            <User size={14} /> Sign in
          </button>
        )}
      </div>
    );
  }

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
