import React from "react";
import { Menu, X } from "lucide-react";
import { GoogleUser, ReviewerRole } from "../../types";
import { TopbarBrand } from "./topbar/TopbarBrand";
import { TopbarHealthBadge } from "./topbar/TopbarHealthBadge";
import { TopbarActions } from "./topbar/TopbarActions";

interface TopbarProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  companyName: string;
  onOpenSettings: () => void;
  backendHealth: "ok" | "degraded" | "checking";
  onNavigateHome: () => void;
  role?: ReviewerRole;
  setRole?: (role: ReviewerRole) => void;
  showToast?: (msg: string) => void;
  user?: GoogleUser | null;
  onLogout?: () => void;
  googleClientId?: string;
  onCredentialSuccess?: (res: { credential: string }) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  mobileNavOpen,
  setMobileNavOpen,
  companyName,
  onOpenSettings,
  backendHealth,
  onNavigateHome,
  role,
  setRole,
  showToast,
  user,
  onLogout,
  googleClientId,
  onCredentialSuccess,
}) => {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <TopbarBrand
        onNavigateHome={onNavigateHome}
        onOpenSettings={onOpenSettings}
        companyName={companyName}
      />
      <TopbarHealthBadge backendHealth={backendHealth} />
      <TopbarActions
        role={role}
        setRole={setRole}
        showToast={showToast}
        user={user}
        onLogout={onLogout}
        googleClientId={googleClientId}
        onCredentialSuccess={onCredentialSuccess}
      />
    </header>
  );
};
