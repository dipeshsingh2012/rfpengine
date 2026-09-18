import React from "react";
import { CheckCircle2, Sparkles, Zap, FolderOpen, Clock } from "lucide-react";
import { ActivityLogItem } from "../../../types";

interface ActivityFeedItemProps {
  log: ActivityLogItem;
}

const TYPE_CONFIG = {
  approval: { bg: "#ecfdf5", color: "#059669", Icon: CheckCircle2 },
  kb: { bg: "#fffbeb", color: "#d97706", Icon: Sparkles },
  generation: { bg: "#eff6ff", color: "#2563eb", Icon: Zap },
  import: { bg: "#f8fafc", color: "#64748b", Icon: FolderOpen },
  review: { bg: "#f1f5f9", color: "#64748b", Icon: Clock },
};

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ log }) => {
  const config = TYPE_CONFIG[log.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.review;
  const { Icon, bg, color } = config;

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        padding: "14px",
        borderRadius: "8px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        alignItems: "flex-start",
      }}
    >
      <div style={{ padding: "8px", borderRadius: "6px", background: bg, color }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{log.action}</strong>
          <small style={{ color: "var(--muted)", fontSize: "11px" }}>{log.timestamp}</small>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>{log.details}</p>
        <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--muted)" }}>
          Actor: <strong>{log.user}</strong>
        </div>
      </div>
    </div>
  );
};

