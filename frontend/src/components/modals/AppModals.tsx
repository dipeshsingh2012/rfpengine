import React from "react";
import { ReviewGovernanceModal } from "./ReviewGovernanceModal";
import { KnowledgeBaseModal } from "./KnowledgeBaseModal";
import { ActivityLogModal } from "./ActivityLogModal";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";
import { ExportPackageModal } from "./ExportPackageModal";
import { AppModalsProps } from "./types";

export const AppModals: React.FC<AppModalsProps> = (p) => {
  return (
    <>
      <ReviewGovernanceModal
        isOpen={p.showReviewModal}
        onClose={() => p.setShowReviewModal(false)}
        reviewTargetRole={p.reviewTargetRole}
        setReviewTargetRole={p.setReviewTargetRole}
        reviewSelectedQuestion={p.reviewSelectedQuestion}
        reviewModalScope={p.reviewModalScope}
        setReviewModalScope={p.setReviewModalScope}
        reviewInstructions={p.reviewInstructions}
        setReviewInstructions={p.setReviewInstructions}
        onSubmit={p.submitSendForReview}
        allQuestionsCount={p.allQuestionsCount}
        currentQuestionText={p.currentQuestionText}
      />
      <KnowledgeBaseModal
        isOpen={p.showKBModal}
        onClose={p.closeKBModal}
        tab={p.kbModalTab}
        setTab={p.setKbModalTab}
        isDragOver={p.isDragOver}
        setIsDragOver={p.setIsDragOver}
        isUploadingKB={p.isUploadingKB}
        handleKBUpload={p.handleKBUpload}
        kbUploadMsg={p.kbUploadMsg}
        isFetchingKB={p.isFetchingKB}
        kbEntries={p.kbEntries}
        fetchKBEntries={p.fetchKBEntries}
        handleDeleteKBEntry={p.handleDeleteKBEntry}
        playgroundTopK={p.playgroundTopK}
        setPlaygroundTopK={p.setPlaygroundTopK}
        playgroundQuery={p.playgroundQuery}
        setPlaygroundQuery={p.setPlaygroundQuery}
        playgroundLoading={p.playgroundLoading}
        handlePlaygroundSearch={p.handlePlaygroundSearch}
        playgroundError={p.playgroundError}
        playgroundResult={p.playgroundResult}
        apiBaseUrl={p.apiBaseUrl}
        tenantId={p.tenantId}
        kbTotalRecords={p.kbTotalRecords}
        kbTotalSources={p.kbTotalSources}
      />
      <ActivityLogModal
        isOpen={p.showActivityModal}
        onClose={() => p.setShowActivityModal(false)}
        activityLogs={p.activityLogs}
      />
      <WorkspaceSettingsModal
        isOpen={p.showSettingsModal}
        onClose={() => p.setShowSettingsModal(false)}
        settings={p.workspaceSettings}
        setSettings={p.setWorkspaceSettings}
        onSave={p.saveWorkspaceSettings}
        onExport={p.exportWorkspaceData}
        isSaving={p.isSavingSettings}
        saveNotice={p.settingsSaveNotice}
        tenantId={p.tenantId}
        kbRecordsCount={p.kbTotalRecords}
        kbDocumentsCount={p.kbTotalSources}
        recentRfpsCount={p.recentRfpsCount}
        settingsTab={p.settingsTab}
        setSettingsTab={p.setSettingsTab}
      />
      <ExportPackageModal
        isOpen={p.showExportModal}
        onClose={() => p.setShowExportModal(false)}
        title={p.sourceLabel}
        totalQuestions={p.totalQuestions}
        approvedCount={p.approvedCount}
        onExport={p.handleExportPackage}
      />
    </>
  );
};

