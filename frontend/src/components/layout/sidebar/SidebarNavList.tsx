import React from "react";
import { LayoutGrid, FileText, FolderOpen, Zap, TrendingUp, History, Settings } from "lucide-react";

interface SidebarNavListProps {
  isOverviewActive: boolean;
  isResponsesActive: boolean;
  isKbActive: boolean;
  isPlaygroundActive: boolean;
  isAdminActive?: boolean;
  isSettingsActive?: boolean;
  isActivityActive: boolean;
  recentCount: number;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId: string;
  onNavigateHome: () => void;
  onNavigateResponses: () => void;
  onNavigateAdmin?: () => void;
  onNavigateSettings?: () => void;
  onOpenKB: (tab: "upload" | "connectors" | "playground") => void;
  onOpenActivity: () => void;
  onCloseMobile: () => void;
}

export const SidebarNavList: React.FC<SidebarNavListProps> = ({
  isOverviewActive,
  isResponsesActive,
  isKbActive,
  isPlaygroundActive,
  isAdminActive,
  isSettingsActive,
  isActivityActive,
  recentCount,
  kbTotalRecords,
  kbTotalSources,
  tenantId,
  onNavigateHome,
  onNavigateResponses,
  onNavigateAdmin,
  onNavigateSettings,
  onOpenKB,
  onOpenActivity,
  onCloseMobile,
}) => {
  return (
    <div className="sidebar-section">
      <p className="eyebrow">Workspaces</p>
      <nav className="nav-list">
        <button className={`nav-item ${isOverviewActive ? "active" : ""}`} onClick={() => { onCloseMobile(); onNavigateHome(); }}>
          <LayoutGrid size={17} /> Overview
        </button>
        <button className={`nav-item ${isResponsesActive ? "active" : ""}`} onClick={() => { onCloseMobile(); onNavigateResponses(); }}>
          <FileText size={17} /> Responses <span className="nav-count">{recentCount}</span>
        </button>
        <button className={`nav-item ${isKbActive ? "active" : ""}`} onClick={() => { onCloseMobile(); onOpenKB("upload"); }}>
          <FolderOpen size={17} /> Knowledge base{" "}
          {kbTotalSources > 0 && (
            <span className="nav-count" title={`${kbTotalRecords} records across ${kbTotalSources} documents for ${tenantId}`}>
              {kbTotalSources} {kbTotalSources === 1 ? "doc" : "docs"}
            </span>
          )}
        </button>
        <button className={`nav-item ${isPlaygroundActive ? "active" : ""}`} onClick={() => { onCloseMobile(); onOpenKB("playground"); }}>
          <Zap size={17} /> KB Playground
        </button>
        <button className={`nav-item ${isAdminActive || isSettingsActive ? "active" : ""}`} onClick={() => { onCloseMobile(); (onNavigateSettings || onNavigateAdmin)?.(); }}>
          <Settings size={17} /> Settings & Admin
        </button>
        <a href="https://rfpengine.aroadmap.dev/" target="_blank" rel="noopener noreferrer" className="nav-item" style={{ textDecoration: "none" }} onClick={onCloseMobile}>
          <TrendingUp size={17} /> Product Roadmap
          <span className="nav-count" style={{ background: "#e0e7ff", color: "var(--blue)", padding: "1px 5px", borderRadius: "10px", fontWeight: 700, fontSize: "9px" }}>
            LIVE ↗
          </span>
        </a>
        <button className={`nav-item ${isActivityActive ? "active" : ""}`} onClick={() => { onCloseMobile(); onOpenActivity(); }}>
          <History size={17} /> Activity
        </button>
      </nav>
    </div>
  );
};
