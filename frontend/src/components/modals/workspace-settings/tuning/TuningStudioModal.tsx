import React from "react";
import { X, Sparkles, Plus, AlertCircle } from "lucide-react";
import { WorkspaceSettings } from "../../../../types";
import { useTuningStudioState } from "./useTuningStudioState";
import { TuningDatasetStatsCard } from "./TuningDatasetStatsCard";
import { TuningJobsTable } from "./TuningJobsTable";
import { NewTuningJobModal } from "./NewTuningJobModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onShowToast?: (msg: string) => void;
}

export const TuningStudioModal: React.FC<Props> = ({ isOpen, onClose, tenantId, settings, setSettings, onShowToast }) => {
  const state = useTuningStudioState(tenantId, settings, setSettings, onShowToast);
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card, #fff)", width: "760px", maxHeight: "90vh", borderRadius: "14px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} color="var(--blue)" /> Gemini Supervised Tuning Studio
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Train Google Cloud Vertex AI base models on enterprise Q&A pairs to produce custom dedicated endpoints.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {state.error && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", marginBottom: "14px" }}>
              <AlertCircle size={15} /> {state.error}
            </div>
          )}

          <TuningDatasetStatsCard preview={state.preview} isLoading={state.isLoading} onRefresh={state.refreshPreview} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 10px" }}>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Training Jobs & Endpoints</h4>
            <button
              type="button"
              onClick={() => state.setIsNewJobModalOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--blue, #2563eb)", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              <Plus size={14} /> New Tuning Job
            </button>
          </div>

          <TuningJobsTable
            jobs={state.jobs}
            activeModelId={settings.active_tuned_model_id || null}
            onActivate={state.activateTunedModel}
            onCancel={state.cancelTuningJob}
          />
        </div>

        <NewTuningJobModal
          isOpen={state.isNewJobModalOpen}
          isStarting={state.isStartingJob}
          totalPairs={state.preview?.total_pairs || 0}
          onClose={() => state.setIsNewJobModalOpen(false)}
          onSubmit={state.startTuningJob}
        />
      </div>
    </div>
  );
};
