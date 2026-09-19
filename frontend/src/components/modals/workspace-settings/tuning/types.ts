import { TuningDatasetPreview, TuningJobItem } from "../../../../types";

export interface TuningStudioState {
  jobs: TuningJobItem[];
  preview: TuningDatasetPreview | null;
  isLoading: boolean;
  isStartingJob: boolean;
  activeJobId: string | null;
  isNewJobModalOpen: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  refreshPreview: () => Promise<void>;
  startTuningJob: (
    baseModel: string,
    epochs: number,
    lrMultiplier: number,
    includeGoldenQa?: boolean,
    includeApprovedReviews?: boolean
  ) => Promise<boolean>;
  activateTunedModel: (jobId: string) => Promise<boolean>;
  cancelTuningJob: (jobId: string) => Promise<boolean>;
  setIsNewJobModalOpen: (open: boolean) => void;
}

