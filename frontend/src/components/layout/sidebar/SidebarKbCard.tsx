import React from "react";
import { FolderOpen } from "lucide-react";

interface SidebarKbCardProps {
  showSettingsModal?: boolean;
  onOpenSettings?: () => void;
  onOpenKB: (tab: "upload" | "connectors" | "playground") => void;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId: string;
  onCloseMobile: () => void;
}

export const SidebarKbCard: React.FC<SidebarKbCardProps> = ({
  onOpenKB,
  kbTotalRecords,
  kbTotalSources,
  tenantId,
  onCloseMobile,
}) => {
  return (
    <div className="sidebar-bottom">
      <div
        className="kb-summary-card"
        title="Open Knowledge Base & Documents"
        onClick={() => {
          onCloseMobile();
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
  );
};

