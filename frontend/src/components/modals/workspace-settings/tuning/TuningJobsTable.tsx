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
      <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--muted)", background: "var(--bg-subtle, rgba(0,0,0,0.02))", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>No Vertex AI Gemini tuning jobs yet</p>
        <span style={{ fontSize: "12px" }}>Launch a supervised training job above to create your tenant's first custom RFP model.</span>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ background: "var(--bg-subtle, rgba(0,0,0,0.03))", borderBottom: "1px solid var(--border-color)", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
            <th style={{ padding: "8px 12px" }}>Model & Job ID</th>
            <th style={{ padding: "8px 12px" }}>Status</th>
            <th style={{ padding: "8px 12px" }}>Pairs & Epochs</th>
            <th style={{ padding: "8px 12px" }}>Created</th>
            <th style={{ padding: "8px 12px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <TuningJobRow
              key={job.id}
              job={job}
              isActive={activeModelId !== null && (job.tuned_model_name === activeModelId || job.id === activeModelId)}
              onActivate={onActivate}
              onCancel={onCancel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
