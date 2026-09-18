import React from "react";
import { Plus, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { KBSourceItem } from "../../../types";
import { KBConnectorCard } from "./KBConnectorCard";

interface KBConnectorsTabProps {
  sources: KBSourceItem[];
  isLoading: boolean;
  isSyncingAll: boolean;
  syncingSourceIds: Set<string>;
  syncNotice: { text: string; isError?: boolean } | null;
  onOpenAddModal: () => void;
  onSyncAll: () => void;
  onTriggerSync: (id: string) => void;
  onViewLogs: (source: KBSourceItem) => void;
  onDelete: (id: string) => void;
}

export const KBConnectorsTab: React.FC<KBConnectorsTabProps> = ({
  sources,
  isLoading,
  isSyncingAll,
  syncingSourceIds,
  syncNotice,
  onOpenAddModal,
  onSyncAll,
  onTriggerSync,
  onViewLogs,
  onDelete,
}) => {
  return (
    <div className="kb-connectors-tab">
      <div className="kb-connectors-toolbar">
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>Continuous Knowledge Ingestion</h3>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
            Automatically synchronize security documentation, GitHub trust repos, and live policies.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary-button" onClick={onSyncAll} disabled={isSyncingAll || sources.length === 0}>
            <RefreshCw size={14} className={isSyncingAll ? "spin" : ""} />
            {isSyncingAll ? "Syncing All Connectors..." : "Sync All"}
          </button>
          <button className="primary-button" onClick={onOpenAddModal}>
            <Plus size={14} /> Add Connector
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className={`kb-notice-banner ${syncNotice.isError ? "error" : "success"}`} style={{ margin: "14px 0" }}>
          {syncNotice.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{syncNotice.text}</span>
        </div>
      )}

      <div className="kb-sources-grid">
        {isLoading ? (
          <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: "30px" }}>
            <RefreshCw size={24} className="spin" /> Loading automated connectors...
          </div>
        ) : sources.length === 0 ? (
          <div className="kb-empty-sources" style={{ gridColumn: "1 / -1" }}>
            <h4>No automated connectors configured</h4>
            <p>Connect your GitHub repository, trust portal URLs, or cloud folder to keep RFP answers grounded automatically.</p>
            <button className="primary-button" onClick={onOpenAddModal}>
              <Plus size={14} /> Configure First Connector
            </button>
          </div>
        ) : (
          sources.map((source) => (
            <KBConnectorCard
              key={source.id}
              source={source}
              isSyncing={syncingSourceIds.has(source.id)}
              onTriggerSync={onTriggerSync}
              onViewLogs={onViewLogs}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

