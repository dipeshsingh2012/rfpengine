import React from "react";
import { Users, Workflow, Cpu, Shield, Database } from "lucide-react";
import { AdminTabKey } from "../../hooks/useAdminManager";

interface AdminTabsNavProps {
  currentTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
}

const TABS: Array<{ id: AdminTabKey; label: string; icon: React.ReactNode }> = [
  { id: "team", label: "Team & RBAC", icon: <Users size={15} /> },
  { id: "governance", label: "Workflow & Governance", icon: <Workflow size={15} /> },
  { id: "ai", label: "AI & Models", icon: <Cpu size={15} /> },
  { id: "security", label: "Security & SSO", icon: <Shield size={15} /> },
  { id: "data", label: "Data & Storage", icon: <Database size={15} /> },
];

export const AdminTabsNav: React.FC<AdminTabsNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav className="admin-tabs-nav" aria-label="Admin Navigation Tabs">
      {TABS.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`admin-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

