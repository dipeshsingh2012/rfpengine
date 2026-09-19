import React from "react";
import { Plus, FileText } from "lucide-react";
import { RecentRFPItem } from "../../../types";

interface SidebarRecentRFPsProps {
  recentRFPs: RecentRFPItem[];
  isResponsesActive: boolean;
  activeResponseId: string;
  currentRoute?: string;
  onSelectRFP: (id: string) => void;
  onNavigateHome: () => void;
  onCloseMobile: () => void;
}

export const SidebarRecentRFPs: React.FC<SidebarRecentRFPsProps> = ({
  recentRFPs,
  isResponsesActive,
  activeResponseId,
  currentRoute,
  onSelectRFP,
  onNavigateHome,
  onCloseMobile,
}) => {
  return (
    <div className="sidebar-section recent-section">
      <div className="recent-header">
        <span className="eyebrow">Recent RFPs</span>
        <button
          type="button"
          className="tiny-action recent-add-btn"
          title="New questionnaire"
          aria-label="New questionnaire"
          onClick={() => { onCloseMobile(); onNavigateHome(); }}
        >
          <Plus size={13} />
        </button>
      </div>

      {!recentRFPs || recentRFPs.length === 0 ? (
        <div className="recent-empty">
          <p>No recent proposals</p>
          <button
            type="button"
            className="recent-empty-action"
            onClick={() => { onCloseMobile(); onNavigateHome(); }}
          >
            <Plus size={12} /> New proposal
          </button>
        </div>
      ) : (
        <div className="recent-list">
          {recentRFPs.map((rfp) => {
            const isSelected = isResponsesActive && activeResponseId === rfp.id && currentRoute !== "/responses";
            const qCount = rfp.questionsCount ?? (rfp as any).count;
            const timeLabel = rfp.editedAt || (rfp as any).date || "Recently";

            return (
              <button
                key={rfp.id}
                type="button"
                className={`recent-item ${isSelected ? "selected" : ""}`}
                title={rfp.title}
                onClick={() => { onCloseMobile(); onSelectRFP(rfp.id); }}
              >
                <span className={`file-icon ${rfp.color || "blue"}`}>
                  <FileText size={14} />
                </span>
                <span className="recent-item-info">
                  <strong>{rfp.title}</strong>
                  <span className="recent-item-meta">
                    {qCount !== undefined && <span className="recent-q-badge">{`${qCount}Q`}</span>}
                    <small>Edited {timeLabel}</small>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

