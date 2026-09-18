import React from "react";
import { Building2, Cpu, ShieldCheck, Database } from "lucide-react";

export type SettingsTabKey = "profile" | "ai" | "governance" | "data";

interface SettingsNavTabsProps {
  currentTab: SettingsTabKey;
  onSelectTab: (tab: SettingsTabKey) => void;
}

export const SettingsNavTabs: React.FC<SettingsNavTabsProps> = ({ currentTab, onSelectTab }) => {
  return (
    <div className="settings-tabs-nav">
      <button
        className={`settings-tab-item ${currentTab === "profile" ? "active" : ""}`}
        onClick={() => onSelectTab("profile")}
      >
        <Building2 size={14} /> Profile & Identity
      </button>
      <button
        className={`settings-tab-item ${currentTab === "ai" ? "active" : ""}`}
        onClick={() => onSelectTab("ai")}
      >
        <Cpu size={14} /> AI & Model Tuning
      </button>
      <button
        className={`settings-tab-item ${currentTab === "governance" ? "active" : ""}`}
        onClick={() => onSelectTab("governance")}
      >
        <ShieldCheck size={14} /> SME Governance
      </button>
      <button
        className={`settings-tab-item ${currentTab === "data" ? "active" : ""}`}
        onClick={() => onSelectTab("data")}
      >
        <Database size={14} /> Data & Export
      </button>
    </div>
  );
};

