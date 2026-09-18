import React from "react";
import { ChevronDown } from "lucide-react";

interface TopbarBrandProps {
  onNavigateHome: () => void;
  onOpenSettings: () => void;
  companyName: string;
}

export const TopbarBrand: React.FC<TopbarBrandProps> = ({
  onNavigateHome,
  onOpenSettings,
  companyName,
}) => {
  return (
    <>
      <button className="brand-mark" onClick={onNavigateHome} aria-label="Go to home">
        <span>R</span>
      </button>
      <div className="brand-name">
        RFP<span>Engine</span>
      </div>
      <div
        className="workspace-switcher"
        onClick={onOpenSettings}
        style={{ cursor: "pointer" }}
        title="Open Workspace Settings"
      >
        <span className="workspace-dot" /> {companyName || "Acme Corporation"}{" "}
        <ChevronDown size={15} />
      </div>
    </>
  );
};

