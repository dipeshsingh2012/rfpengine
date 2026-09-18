import React from "react";
import { ActivityLogItem } from "../../../types";

interface ActivityStatsBarProps {
  activityLogs: ActivityLogItem[];
}

export const ActivityStatsBar: React.FC<ActivityStatsBarProps> = ({ activityLogs }) => {
  const approvalsCount = activityLogs.filter((a) => a.type === "approval").length;
  const kbCount = activityLogs.filter((a) => a.type === "kb").length;

  return (
    <div className="activity-stats-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
      <div style={{ flex: 1, background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <span className="eyebrow" style={{ color: "var(--muted)" }}>Total Events</span>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>{activityLogs.length}</div>
      </div>
      <div style={{ flex: 1, background: "#f0fdf4", padding: "12px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
        <span className="eyebrow" style={{ color: "#166534" }}>Approvals</span>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "#15803d" }}>{approvalsCount}</div>
      </div>
      <div style={{ flex: 1, background: "#fef3c7", padding: "12px 14px", borderRadius: "8px", border: "1px solid #fde68a" }}>
        <span className="eyebrow" style={{ color: "#92400e" }}>KB Promotions</span>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "#b45309" }}>{kbCount}</div>
      </div>
    </div>
  );
};

