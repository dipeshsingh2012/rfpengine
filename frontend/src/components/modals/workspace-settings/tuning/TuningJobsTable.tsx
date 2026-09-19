import React from "react";
import { TuningJobItem } from "../../../../types";
import { TuningJobRow } from "./TuningJobRow";

interface Props {
  jobs: TuningJobItem[];
  activeModelId: string | null;
  onActivate: (id: string) => void;
  onCancel: (id: string) => void;
}

export const TuningJobsTable: React.FC<Props> = ({ jobs, activeModelId, onActivate, onCancel }) => {
  if (jobs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", minHeight: "260px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "var(--muted)", background: "var(--bg-subtle, rgba(0,0,0,0.02))", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
        <p style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 600 }}>No Vertex AI Gemini tuning jobs yet</p>
        <span style={{ fontSize: "13px" }}>Launch a supervised training job above to create your tenant's first custom RFP model.</span>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", minHeight: "300px", maxHeight: "480px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--paper)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-subtle, #f8fafc)" }}>
          <tr style={{ borderBottom: "1px solid var(--border-color)", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
            <th style={{ padding: "12px 16px" }}>Model & Job ID</th>
            <th style={{ padding: "12px 16px" }}>Status</th>
            <th style={{ padding: "12px 16px" }}>Pairs & Epochs</th>
            <th style={{ padding: "12px 16px" }}>Created</th>
            <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <TuningJobRow
              key={job.id}
              job={job}
              isActive={Boolean(
                activeModelId !== null &&
                (job.tuned_model_name === activeModelId ||
                  job.id === activeModelId ||
                  (job.tuned_model_name && job.tuned_model_name.endsWith(activeModelId)) ||
                  (job.tuned_model_name && activeModelId.endsWith(job.tuned_model_name.split("/").pop() || "")))
              )}
              onActivate={onActivate}
              onCancel={onCancel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

