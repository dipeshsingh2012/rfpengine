import React from "react";
import { X, Sparkles, Plus, AlertCircle } from "lucide-react";
import { WorkspaceSettings } from "../../../../types";
import { useTuningStudioState } from "./useTuningStudioState";
import { TuningDatasetStatsCard } from "./TuningDatasetStatsCard";
import { TuningJobsTable } from "./TuningJobsTable";
import { NewTuningJobModal } from "./NewTuningJobModal";
import { ModalPortal } from "../../../common/ModalPortal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onShowToast?: (msg: string) => void;
}

export const TuningStudioModal: React.FC<Props> = ({
  isOpen, onClose, tenantId, settings, setSettings, onShowToast,
}) => {
  const state = useTuningStudioState(tenantId, settings, setSettings, onShowToast, isOpen);

  return (
    <>
      <ModalPortal
        isOpen={isOpen}
        onClose={onClose}
        cardClassName="modal-card tuning-studio-modal"
        ariaLabel="Gemini Supervised Tuning Studio"
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title-row">
              <Sparkles size={18} color="var(--blue)" /> Gemini Supervised Tuning Studio
            </h3>
            <p className="settings-group-subtitle" style={{ marginTop: "3px" }}>
              Train Google Cloud Vertex AI base models on enterprise Q&A pairs to produce custom dedicated endpoints.
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body form-grid">
          {state.error && (
            <div className="alert-banner error" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={15} /> {state.error}
            </div>
          )}

          <TuningDatasetStatsCard
            preview={state.preview}
            isLoading={state.isLoading}
            onRefresh={state.refreshPreview}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px" }}>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Training Jobs & Endpoints</h4>
            <button
              type="button"
              className="primary-button"
              onClick={() => state.setIsNewJobModalOpen(true)}
              style={{ padding: "6px 12px", fontSize: "12px" }}
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

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </ModalPortal>

      <NewTuningJobModal
        isOpen={state.isNewJobModalOpen}
        isStarting={state.isStartingJob}
        totalPairs={state.preview?.total_pairs || 0}
        goldenQaCount={state.preview?.golden_qa_count}
        approvedReviewsCount={state.preview?.approved_reviews_count}
        onClose={() => state.setIsNewJobModalOpen(false)}
        onSubmit={state.startTuningJob}
      />
    </>
  );
};
