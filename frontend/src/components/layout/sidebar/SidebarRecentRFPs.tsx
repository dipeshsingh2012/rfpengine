import React from "react";
import { Plus, FileText } from "lucide-react";
import { RecentRFPItem } from "../../../types";

interface SidebarRecentRFPsProps {
  recentRFPs: RecentRFPItem[];
  isResponsesActive: boolean;
  activeResponseId: string;
  onSelectRFP: (id: string) => void;
  onNavigateHome: () => void;
  onCloseMobile: () => void;
}

export const SidebarRecentRFPs: React.FC<SidebarRecentRFPsProps> = ({
  recentRFPs,
  isResponsesActive,
  activeResponseId,
  onSelectRFP,
  onNavigateHome,
  onCloseMobile,
}) => {
  return (
    <div className="sidebar-section recent-section">
      <p className="eyebrow">
        Recent RFPs{" "}
        <button
          className="tiny-action"
          title="Add RFP"
          onClick={() => {
            onCloseMobile();
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
              onCloseMobile();
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
  );
};

