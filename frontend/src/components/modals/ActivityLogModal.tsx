import React from "react";
import {
  History,
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  FolderOpen,
  Clock,
} from "lucide-react";
import { ActivityLogItem } from "../../types";

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
      <div
        className="kb-modal-container"
        style={{ maxWidth: "720px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <History size={20} color="var(--blue)" />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--ink)" }}>
              Workspace Activity & Audit Log
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close Activity modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="kb-modal-body" style={{ padding: "20px 24px" }}>
          <div className="activity-stats-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
            <div
              style={{
                flex: 1,
                background: "#f8fafc",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <span className="eyebrow" style={{ color: "var(--muted)" }}>
                Total Events
              </span>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>
                {activityLogs.length}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: "#f0fdf4",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
              }}
            >
              <span className="eyebrow" style={{ color: "#166534" }}>
                Approvals
              </span>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#15803d" }}>
                {activityLogs.filter((a) => a.type === "approval").length}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: "#fef3c7",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #fde68a",
              }}
            >
              <span className="eyebrow" style={{ color: "#92400e" }}>
                KB Promotions
              </span>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#b45309" }}>
                {activityLogs.filter((a) => a.type === "kb").length}
              </div>
            </div>
          </div>

          <div
            className="activity-feed-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            {activityLogs.map((log) => (
              <div
                key={log.id}
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
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    background:
                      log.type === "approval"
                        ? "#ecfdf5"
                        : log.type === "kb"
                          ? "#fffbeb"
                          : log.type === "generation"
                            ? "#eff6ff"
                            : "#f1f5f9",
                    color:
                      log.type === "approval"
                        ? "#059669"
                        : log.type === "kb"
                          ? "#d97706"
                          : log.type === "generation"
                            ? "#2563eb"
                            : "#64748b",
                  }}
                >
                  {log.type === "approval" && <CheckCircle2 size={18} />}
                  {log.type === "kb" && <Sparkles size={18} />}
                  {log.type === "generation" && <Zap size={18} />}
                  {log.type === "import" && <FolderOpen size={18} />}
                  {log.type === "review" && <Clock size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                      {log.action}
                    </strong>
                    <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {log.timestamp}
                    </small>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                    {log.details}
                  </p>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--muted)" }}>
                    Actor: <strong>{log.user}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

