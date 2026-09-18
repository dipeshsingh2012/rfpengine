import React from "react";
import {
  LayoutGrid,
  FileText,
  FolderOpen,
  Zap,
  TrendingUp,
  History,
  Plus,
  Settings,
} from "lucide-react";
import { RecentRFPItem } from "../../types";

interface SidebarProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  isOverviewActive: boolean;
  isResponsesActive: boolean;
  isKbActive: boolean;
  isPlaygroundActive: boolean;
  isActivityActive: boolean;
  recentRFPs: RecentRFPItem[];
  activeResponseId: string;
  onNavigateHome: () => void;
  onNavigateResponses: () => void;
  onSelectRFP: (id: string) => void;
  onOpenKB: (tab: "upload" | "connectors" | "playground") => void;
  onOpenActivity: () => void;
  onOpenSettings: () => void;
  showSettingsModal: boolean;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileNavOpen,
  setMobileNavOpen,
  isOverviewActive,
  isResponsesActive,
  isKbActive,
  isPlaygroundActive,
  isActivityActive,
  recentRFPs,
  activeResponseId,
  onNavigateHome,
  onNavigateResponses,
  onSelectRFP,
  onOpenKB,
  onOpenActivity,
  onOpenSettings,
  showSettingsModal,
  kbTotalRecords,
  kbTotalSources,
  tenantId = "acme-corp",
}) => {
  return (
    <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
      <div className="sidebar-section">
        <p className="eyebrow">Workspaces</p>
        <nav className="nav-list">
          <button
            className={`nav-item ${isOverviewActive ? "active" : ""}`}
            onClick={() => {
              setMobileNavOpen(false);
              onNavigateHome();
            }}
          >
            <LayoutGrid size={17} /> Overview
          </button>
          <button
            className={`nav-item ${isResponsesActive ? "active" : ""}`}
            onClick={() => {
              setMobileNavOpen(false);
              onNavigateResponses();
            }}
          >
            <FileText size={17} /> Responses{" "}
            <span className="nav-count">{recentRFPs.length > 0 ? recentRFPs.length : 12}</span>
          </button>
          <button
            className={`nav-item ${isKbActive ? "active" : ""}`}
            onClick={() => {
              setMobileNavOpen(false);
              onOpenKB("upload");
            }}
          >
            <FolderOpen size={17} /> Knowledge base{" "}
            {kbTotalSources > 0 && (
              <span
                className="nav-count"
                title={`${kbTotalRecords} indexed records across ${kbTotalSources} documents for ${tenantId}`}
              >
                {kbTotalSources} {kbTotalSources === 1 ? "doc" : "docs"}
              </span>
            )}
          </button>
          <button
            className={`nav-item ${isPlaygroundActive ? "active" : ""}`}
            onClick={() => {
              setMobileNavOpen(false);
              onOpenKB("playground");
            }}
          >
            <Zap size={17} /> KB Playground
          </button>
          <a
            href="https://rfpengine.aroadmap.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{ textDecoration: "none" }}
            onClick={() => setMobileNavOpen(false)}
          >
            <TrendingUp size={17} /> Product Roadmap
            <span
              className="nav-count"
              style={{
                background: "#e0e7ff",
                color: "var(--blue)",
                padding: "1px 5px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "9px",
              }}
            >
              LIVE ↗
            </span>
          </a>
          <button
            className={`nav-item ${isActivityActive ? "active" : ""}`}
            onClick={() => {
              setMobileNavOpen(false);
              onOpenActivity();
            }}
          >
            <History size={17} /> Activity
          </button>
        </nav>
      </div>

      <div className="sidebar-section recent-section">
        <p className="eyebrow">
          Recent RFPs{" "}
          <button
            className="tiny-action"
            title="Add RFP"
            onClick={() => {
              setMobileNavOpen(false);
              onNavigateHome();
            }}
          >
            <Plus size={14} />
          </button>
        </p>
        {recentRFPs.map((rfp) => {
          const isSelected = isResponsesActive && activeResponseId === rfp.id;
          return (
            <button
              key={rfp.id}
              className={`recent-item ${isSelected ? "selected" : ""}`}
              onClick={() => {
                setMobileNavOpen(false);
                onSelectRFP(rfp.id);
              }}
            >
              <span className={`file-icon ${rfp.color || "blue"}`}>
                <FileText size={15} />
              </span>
              <span>
                <strong>{rfp.title}</strong>
                <small>Edited {rfp.editedAt}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="sidebar-bottom">
        <button
          className={`nav-item ${showSettingsModal ? "active" : ""}`}
          onClick={() => {
            setMobileNavOpen(false);
            onOpenSettings();
          }}
        >
          <Settings size={17} /> Workspace settings
        </button>
        <div
          className="kb-summary-card"
          title="Open Knowledge Base & Documents"
          onClick={() => {
            setMobileNavOpen(false);
            onOpenKB("upload");
          }}
        >
          <div className="kb-summary-header">
            <span>Knowledge Base</span>
            <span className="kb-summary-status">
              <span className="status-dot" /> {tenantId}
            </span>
          </div>
          <div className="kb-summary-body">
            <div className="kb-summary-count">
              <span>{kbTotalRecords.toLocaleString()} indexed records</span>
              <FolderOpen size={14} style={{ color: "var(--blue)" }} />
            </div>
            <div className="kb-summary-sources">
              <span>{kbTotalSources} indexed {kbTotalSources === 1 ? "document" : "documents"}</span>
              <span className="kb-manage-link">Manage ↗</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

