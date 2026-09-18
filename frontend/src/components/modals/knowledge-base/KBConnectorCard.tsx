import React from "react";
import { Globe, GitBranch, Cloud, Sparkles, RefreshCw, Clock, Activity, Trash2 } from "lucide-react";
import { KBSourceItem } from "../../../types";

interface KBConnectorCardProps {
  source: KBSourceItem;
  isSyncing: boolean;
  onTriggerSync: (id: string) => void;
  onViewLogs: (source: KBSourceItem) => void;
  onDelete: (id: string) => void;
}

export const KBConnectorCard: React.FC<KBConnectorCardProps> = ({
  source,
  isSyncing,
  onTriggerSync,
  onViewLogs,
  onDelete,
}) => {
  const getIcon = () => {
    switch (source.source_type) {
      case "web_crawler": return <Globe size={18} color="#2563eb" />;
      case "github_docs": return <GitBranch size={18} color="#16a34a" />;
      case "cloud_storage": return <Cloud size={18} color="#9333ea" />;
      default: return <Sparkles size={18} color="#d97706" />;
    }
  };

  return (
    <div className="kb-source-card">
      <div className="kb-source-header">
        <div className="kb-source-icon-title">
          {getIcon()}
          <div>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{source.name}</h4>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              {source.source_type.replace("_", " ").toUpperCase()} • {source.schedule_frequency}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            className="secondary-button icon-btn"
            onClick={() => onTriggerSync(source.id)}
            disabled={isSyncing}
            title="Sync Now"
          >
            <RefreshCw size={13} className={isSyncing ? "spin" : ""} />
          </button>
          <button className="icon-button delete" onClick={() => onDelete(source.id)} title="Delete source">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="kb-source-metrics">
        <div className="source-metric-box">
          <span className="metric-label">Documents</span>
          <span className="metric-value">{source.metrics?.documents_count ?? 0}</span>
        </div>
        <div className="source-metric-box">
          <span className="metric-label">Vector Chunks</span>
          <span className="metric-value">{source.metrics?.chunks_count ?? 0}</span>
        </div>
        <div className="source-metric-box">
          <span className="metric-label">Status</span>
          <span className={`status-tag ${source.status || "idle"}`}>
            {source.status || "Idle"}
          </span>
        </div>
      </div>

      <div className="kb-source-footer">
        <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <Clock size={12} /> {source.last_synced_at ? new Date(source.last_synced_at).toLocaleString() : "Never synced"}
        </span>
        <button className="ghost-button" style={{ fontSize: "11px", padding: "2px 6px" }} onClick={() => onViewLogs(source)}>
          <Activity size={12} /> View Logs
        </button>
      </div>
    </div>
  );
};

