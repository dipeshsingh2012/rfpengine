import React from "react";
import { History, X } from "lucide-react";
import { ActivityLogItem } from "../../types";
import { ActivityStatsBar } from "./activity-log/ActivityStatsBar";
import { ActivityFeedItem } from "./activity-log/ActivityFeedItem";

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityLogs: ActivityLogItem[];
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  activityLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="kb-modal-backdrop" onClick={onClose}>
      <div className="kb-modal-container" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <History size={20} color="var(--blue)" />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--ink)" }}>
              Workspace Activity & Audit Log
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close Activity modal">
            <X size={20} />
          </button>
        </div>

        <div className="kb-modal-body" style={{ padding: "20px 24px" }}>
          <ActivityStatsBar activityLogs={activityLogs} />
          <div className="activity-feed-list" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "420px", overflowY: "auto" }}>
            {activityLogs.map((log) => (
              <ActivityFeedItem key={log.id} log={log} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
