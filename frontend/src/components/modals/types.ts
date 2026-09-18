import React from "react";
import {
  ActivityLogItem,
  KBItem,
  SearchResponse,
  WorkspaceSettings,
} from "../../types";
import { ExportFormat } from "./ExportPackageModal";

export interface AppModalsProps {
  showReviewModal: boolean;
  setShowReviewModal: (show: boolean) => void;
  reviewTargetRole: "Security SME" | "Legal reviewer" | "Final approver";
  setReviewTargetRole: (role: "Security SME" | "Legal reviewer" | "Final approver") => void;
  reviewSelectedQuestion: string | null;
  reviewModalScope: "all" | "current";
  setReviewModalScope: (scope: "all" | "current") => void;
  reviewInstructions: string;
  setReviewInstructions: (inst: string) => void;
  submitSendForReview: () => void;
  allQuestionsCount: number;
  currentQuestionText: string;

  showKBModal: boolean;
  closeKBModal: () => void;
  kbModalTab: "upload" | "connectors" | "playground";
  setKbModalTab: (tab: "upload" | "connectors" | "playground") => void;
  isDragOver: boolean;
  setIsDragOver: (over: boolean) => void;
  isUploadingKB: boolean;
  handleKBUpload: (file: File) => void;
  kbUploadMsg: { text: string; isError?: boolean } | null;
  isFetchingKB: boolean;
  kbEntries: KBItem[];
  fetchKBEntries: () => void;
  handleDeleteKBEntry: (id: string) => void;
  playgroundTopK: number;
  setPlaygroundTopK: (k: number) => void;
  playgroundQuery: string;
  setPlaygroundQuery: (q: string) => void;
  playgroundLoading: boolean;
  handlePlaygroundSearch: (queryOverride?: string) => void;
  playgroundError: string | null;
  playgroundResult: SearchResponse | null;
  apiBaseUrl: string;
  tenantId: string;
  kbTotalRecords: number;
  kbTotalSources: number;

  showActivityModal: boolean;
  setShowActivityModal: (show: boolean) => void;
  activityLogs: ActivityLogItem[];

  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  workspaceSettings: WorkspaceSettings;
  setWorkspaceSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  saveWorkspaceSettings: (updates?: Partial<WorkspaceSettings>) => Promise<void>;
  exportWorkspaceData: () => void;
  isSavingSettings: boolean;
  settingsSaveNotice: string | null;
  recentRfpsCount: number;
  settingsTab: "profile" | "ai" | "governance" | "data";
  setSettingsTab: (tab: "profile" | "ai" | "governance" | "data") => void;

  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  sourceLabel: string;
  totalQuestions: number;
  approvedCount: number;
  handleExportPackage: (format: ExportFormat) => Promise<void>;

  revisionItem: string | null;
  setRevisionItem: (item: string | null) => void;
  onSaveRevisionFeedback: (note: string) => void;
  role: string;
  reviewCommentsByQuestion: Record<string, string>;
}

