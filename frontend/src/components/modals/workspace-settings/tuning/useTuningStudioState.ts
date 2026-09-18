import { useCallback, useEffect, useState } from "react";
import { TuningDatasetPreview, TuningJobItem, WorkspaceSettings } from "../../../../types";
import { getApiBaseUrl } from "../../../../utils/helpers";
import { TuningStudioState } from "./types";

const apiBaseUrl = getApiBaseUrl();

export function useTuningStudioState(
  tenantId: string,
  settings: WorkspaceSettings,
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>,
  onShowToast?: (msg: string) => void
): TuningStudioState {
  const [jobs, setJobs] = useState<TuningJobItem[]>([]);
  const [preview, setPreview] = useState<TuningDatasetPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tuning/jobs`, {
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load tuning jobs");
    }
  }, [tenantId]);

  const refreshPreview = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tuning/dataset-preview`, {
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dataset preview");
    }
  }, [tenantId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([refreshJobs(), refreshPreview()]).finally(() => setIsLoading(false));
  }, [refreshJobs, refreshPreview]);

  const startTuningJob = async (baseModel: string, epochs: number, lrMultiplier: number): Promise<boolean> => {
    setIsStartingJob(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tuning/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({
          base_model: baseModel,
          epochs,
          learning_rate_multiplier: lrMultiplier,
          include_golden_qa: true,
          include_approved_reviews: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onShowToast?.("Vertex AI Gemini tuning job submitted successfully!");
      setIsNewJobModalOpen(false);
      await refreshJobs();
      return true;
    } catch (err: any) {
      setError(err?.message || "Failed to submit tuning job");
      return false;
    } finally {
      setIsStartingJob(false);
    }
  };

  const activateTunedModel = async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tuning/jobs/${jobId}/activate`, {
        method: "POST",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedSettings = await res.json();
      setSettings(updatedSettings);
      onShowToast?.("Custom Gemini tuned model activated as default answering endpoint!");
      return true;
    } catch (err: any) {
      setError(err?.message || "Failed to activate tuned model");
      return false;
    }
  };

  const cancelTuningJob = async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tuning/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onShowToast?.("Tuning job cancelled.");
      await refreshJobs();
      return true;
    } catch (err: any) {
      setError(err?.message || "Failed to cancel tuning job");
      return false;
    }
  };

  return {
    jobs,
    preview,
    isLoading,
    isStartingJob,
    activeJobId: settings.active_tuned_model_id || null,
    isNewJobModalOpen,
    error,
    refreshJobs,
    refreshPreview,
    startTuningJob,
    activateTunedModel,
    cancelTuningJob,
    setIsNewJobModalOpen,
  };
}

