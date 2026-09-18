import React from "react";
import { Menu, X } from "lucide-react";
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
}

export const Topbar: React.FC<TopbarProps> = ({
  mobileNavOpen,
  setMobileNavOpen,
  companyName,
  onOpenSettings,
  backendHealth,
  onNavigateHome,
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
      <TopbarActions />
    </header>
  );
};
