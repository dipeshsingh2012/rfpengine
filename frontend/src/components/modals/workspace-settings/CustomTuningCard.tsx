import React, { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { TuningJobItem, WorkspaceSettings } from "../../../types";
import { TuningStudioModal } from "./tuning/TuningStudioModal";

interface Props {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  tuningJobs?: TuningJobItem[];
  onRefreshJobs?: () => void;
}

export const CustomTuningCard: React.FC<Props> = ({
  settings,
  setSettings,
  tuningJobs = [],
  onRefreshJobs,
}) => {
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const activeModel = settings.active_tuned_model_id;

  const completedTunedModels = tuningJobs.filter(
    (j) => (j.status === "SUCCEEDED" || j.status === "COMPLETED") && (j.tuned_model_name || j.id)
  );

  return (
    <div className="settings-group-card" style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="settings-group-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color="var(--blue)" /> Gemini Supervised Fine-Tuning
          </div>
          <p className="settings-group-subtitle" style={{ margin: "4px 0 0" }}>
            Fine-tune base Gemini models on your historical Golden Q&A and approved RFP responses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsStudioOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--blue, #2563eb)", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          Tuning Studio <ArrowRight size={13} />
        </button>
      </div>

      <div style={{ marginTop: "14px", background: "var(--bg-subtle, rgba(0,0,0,0.02))", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Active Endpoint</div>
          <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
            {activeModel ? (
              <>
                <CheckCircle2 size={14} color="#10b981" />
                <span style={{ color: "#10b981" }}>Custom Tuned Endpoint Active</span>
                <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>({activeModel.split("/").pop()})</span>
              </>
            ) : (
              <span style={{ color: "var(--muted)" }}>Using Base Model ({settings.default_model})</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {completedTunedModels.length > 0 && (
            <select
              value={activeModel || ""}
              onChange={(e) => setSettings({ ...settings, active_tuned_model_id: e.target.value || null })}
              style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)", background: "transparent" }}
            >
              <option value="">Base Model ({settings.default_model})</option>
              {completedTunedModels.map((job) => (
                <option key={job.id} value={job.tuned_model_name || job.id}>
                  {(job.tuned_model_name ? job.tuned_model_name.split("/").pop() : job.id)} ({job.dataset_examples_count} pairs)
                </option>
              ))}
            </select>
          )}

          {activeModel && (
            <button
              type="button"
              onClick={() => setSettings({ ...settings, active_tuned_model_id: null })}
              style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "var(--muted)", cursor: "pointer" }}
            >
              Revert to Base Model
            </button>
          )}
        </div>
      </div>

      <TuningStudioModal
        isOpen={isStudioOpen}
        onClose={() => { setIsStudioOpen(false); onRefreshJobs?.(); }}
        tenantId={settings.tenant_id}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
};
