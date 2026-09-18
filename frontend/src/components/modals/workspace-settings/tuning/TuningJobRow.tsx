import React from "react";
import { Check, Play, XCircle, Activity, Award } from "lucide-react";
import { TuningJobItem } from "../../../../types";

interface Props {
  job: TuningJobItem;
  isActive: boolean;
  onActivate: (id: string) => void;
  onCancel: (id: string) => void;
}

export const TuningJobRow: React.FC<Props> = ({ job, isActive, onActivate, onCancel }) => {
  const isSucceeded = job.status === "SUCCEEDED" || job.status === "COMPLETED";
  const isRunning = job.status === "RUNNING" || job.status === "PENDING";
  const lossText = job.metrics?.eval_loss !== undefined ? `Loss: ${job.metrics.eval_loss}` : null;

  return (
    <tr style={{ borderBottom: "1px solid var(--border-color)", fontSize: "13px" }}>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{job.base_model}</span>
          {isActive && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
              <Award size={11} /> ACTIVE
            </span>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{job.id}</div>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "2px 8px", borderRadius: "12px", fontWeight: 600,
          background: isSucceeded ? "rgba(16,185,129,0.12)" : isRunning ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)",
          color: isSucceeded ? "#10b981" : isRunning ? "#3b82f6" : "#ef4444"
        }}>
          {isRunning && <Activity size={12} className="spin" />}
          {job.status}
        </span>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <div>{job.dataset_examples_count} pairs ({job.epochs} epochs)</div>
        {lossText && <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>{lossText}</div>}
      </td>
      <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: "12px" }}>
        {new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </td>
      <td style={{ padding: "10px 12px", textAlign: "right" }}>
        {isSucceeded && !isActive && (
          <button
            type="button"
            onClick={() => onActivate(job.id)}
            className="settings-action-btn"
            style={{ fontSize: "11px", padding: "4px 8px", color: "var(--blue)", border: "1px solid var(--blue)", borderRadius: "4px", background: "transparent" }}
          >
            Activate
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            onClick={() => onCancel(job.id)}
            style={{ fontSize: "11px", padding: "4px 8px", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "4px", background: "transparent" }}
          >
            Cancel
          </button>
        )}
      </td>
    </tr>
  );
};

