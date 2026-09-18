import React from "react";
import { X, Clock, RefreshCw } from "lucide-react";
import { KBSourceItem, KBSyncLogItem } from "../../../types";
import { ModalPortal } from "../../common/ModalPortal";

interface KBSyncLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: KBSourceItem | null;
  logs: KBSyncLogItem[];
  isLoading: boolean;
}

export const KBSyncLogsModal: React.FC<KBSyncLogsModalProps> = ({
  isOpen,
  onClose,
  source,
  logs,
  isLoading,
}) => {
  if (!source) return null;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      cardClassName="modal-card sync-logs-modal"
      ariaLabel={`Sync History & Logs: ${source.name}`}
    >
      <div className="modal-header">
        <div>
          <h3 style={{ margin: 0 }}>Sync History & Logs: {source.name}</h3>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{source.source_type}</span>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          <X size={16} />
        </button>
      </div>
      <div className="modal-body logs-list">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <RefreshCw size={20} className="spin" /> Loading sync logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
            No sync events recorded for this connector yet.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`sync-log-row ${log.status}`}>
              <div className="log-row-header">
                <span className={`log-status-badge ${log.status}`}>{log.status.toUpperCase()}</span>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <Clock size={11} /> {new Date(log.started_at).toLocaleString()}
                </span>
              </div>
              <div className="log-row-metrics">
                <span>Docs: {log.documents_scanned}</span>
                <span>Chunks: {log.chunks_created}</span>
                <span>Duration: {log.duration_seconds}s</span>
              </div>
              {log.error_details && <p className="log-error-text">Error: {log.error_details}</p>}
            </div>
          ))
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalPortal>
  );
};
