import React from "react";
import { KnowledgeBaseModalProps } from "./knowledge-base/types";
import { useKnowledgeBaseModalState } from "./knowledge-base/useKnowledgeBaseModalState";
import { KBModalHeader } from "./knowledge-base/KBModalHeader";
import { KBTabNav } from "./knowledge-base/KBTabNav";
import { KBUploadTab } from "./knowledge-base/KBUploadTab";
import { KBConnectorsTab } from "./knowledge-base/KBConnectorsTab";
import { KBPlaygroundTab } from "./knowledge-base/KBPlaygroundTab";
import { KBConnectedModals } from "./knowledge-base/KBConnectedModals";
import { ModalPortal } from "../common/ModalPortal";

export { type KnowledgeBaseModalProps } from "./knowledge-base/types";

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = (props) => {
  const state = useKnowledgeBaseModalState(props);

  return (
    <>
      <ModalPortal
        isOpen={props.isOpen}
        onClose={props.onClose}
        overlayClassName="kb-modal-backdrop"
        cardClassName="kb-modal-container"
        ariaLabel="Knowledge Base & Automated Connectors"
      >
        <KBModalHeader onClose={props.onClose} tenantId={props.tenantId || "acme-corp"} />
        <KBTabNav tab={props.tab} setTab={props.setTab} sourcesCount={state.sources.length} />

        <div className="kb-modal-content">
          {props.tab === "upload" && (
            <KBUploadTab
              isDragOver={props.isDragOver}
              setIsDragOver={props.setIsDragOver}
              isUploading={props.isUploadingKB}
              onUpload={props.handleKBUpload}
              uploadMsg={props.kbUploadMsg}
              entries={props.kbEntries}
              isFetching={props.isFetchingKB}
              onRefresh={props.fetchKBEntries}
              onDelete={props.handleDeleteKBEntry}
            />
          )}

          {props.tab === "connectors" && (
            <KBConnectorsTab
              sources={state.sources}
              isLoading={state.isLoadingSources}
              isSyncingAll={state.isSyncingAll}
              syncingSourceIds={state.syncingSourceIds}
              syncNotice={state.syncNotice}
              onOpenAddModal={() => state.setShowAddSourceModal(true)}
              onSyncAll={state.handleSyncAll}
              onTriggerSync={state.handleTriggerSync}
              onViewLogs={state.handleViewLogs}
              onDelete={state.handleDeleteSource}
            />
          )}

          {props.tab === "playground" && (
            <KBPlaygroundTab
              query={props.playgroundQuery}
              setQuery={props.setPlaygroundQuery}
              topK={props.playgroundTopK}
              setTopK={props.setPlaygroundTopK}
              isLoading={props.playgroundLoading}
              onSearch={props.handlePlaygroundSearch}
              error={props.playgroundError}
              result={props.playgroundResult}
            />
          )}
        </div>
      </ModalPortal>

      <KBConnectedModals s={state} />
    </>
  );
};
