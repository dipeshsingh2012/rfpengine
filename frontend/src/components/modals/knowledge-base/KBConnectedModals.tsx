import React from "react";
import { KBAddSourceModal } from "./KBAddSourceModal";
import { KBSyncLogsModal } from "./KBSyncLogsModal";

interface KBConnectedModalsProps {
  s: any;
}

export const KBConnectedModals: React.FC<KBConnectedModalsProps> = ({ s }) => {
  return (
    <>
      <KBAddSourceModal
        isOpen={s.showAddSourceModal}
        onClose={() => s.setShowAddSourceModal(false)}
        onSubmit={s.handleCreateSource}
        name={s.newSourceName}
        setName={s.setNewSourceName}
        sourceType={s.newSourceType}
        setSourceType={s.setNewSourceType}
        url={s.newSourceUrl}
        setUrl={s.setNewSourceUrl}
        repo={s.newSourceRepo}
        setRepo={s.setNewSourceRepo}
        branch={s.newSourceBranch}
        setBranch={s.setNewSourceBranch}
        files={s.newSourceFiles}
        setFiles={s.setNewSourceFiles}
        folder={s.newSourceFolder}
        setFolder={s.setNewSourceFolder}
        category={s.newSourceCategory}
        setCategory={s.setNewSourceCategory}
        schedule={s.newSourceSchedule}
        setSchedule={s.setNewSourceSchedule}
        isSubmitting={s.isSubmittingSource}
      />
      <KBSyncLogsModal
        isOpen={s.showLogsModal}
        onClose={() => s.setShowLogsModal(false)}
        source={s.selectedSourceForLogs}
        logs={s.sourceLogs}
        isLoading={s.isLoadingLogs}
      />
    </>
  );
};

