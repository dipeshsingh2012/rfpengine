import React, { useState } from "react";
import { WorkspaceSummaryItem } from "../../types";
import { useDashboardFilters } from "./dashboard/useDashboardFilters";
import { ResponsesHeader } from "./dashboard/ResponsesHeader";
import { ResponsesMetricCards } from "./dashboard/ResponsesMetricCards";
import { ResponsesToolbar } from "./dashboard/ResponsesToolbar";
import { ResponsesEmptyState } from "./dashboard/ResponsesEmptyState";
import { ResponsesTableView } from "./dashboard/ResponsesTableView";
import { ResponsesGridCardsView } from "./dashboard/ResponsesGridCardsView";
import { DeleteConfirmModal } from "./dashboard/DeleteConfirmModal";

interface ResponsesDashboardProps {
  workspaces: WorkspaceSummaryItem[];
  isLoading: boolean;
  onSelectWorkspace: (id: string) => void;
  onDuplicateWorkspace: (id: string) => Promise<void> | void;
  onDeleteWorkspace: (id: string) => Promise<void> | void;
  onExportWorkspace: (ws: WorkspaceSummaryItem) => void;
  onNewQuestionnaire: () => void;
  onRefresh: () => void;
}

export const ResponsesDashboard: React.FC<ResponsesDashboardProps> = ({
  workspaces,
  isLoading,
  onSelectWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onExportWorkspace,
  onNewQuestionnaire,
  onRefresh,
}) => {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    metrics,
    filteredWorkspaces,
    resetFilters,
  } = useDashboardFilters(workspaces);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(id);
    try { await onDuplicateWorkspace(id); } finally { setActionLoadingId(null); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(id);
    try { await onDeleteWorkspace(id); setConfirmDeleteId(null); } finally { setActionLoadingId(null); }
  };

  const hasFilters = Boolean(searchTerm || statusFilter !== "all" || sourceFilter !== "all");

  return (
    <div className="responses-dashboard-container">
      <ResponsesHeader isLoading={isLoading} onRefresh={onRefresh} onNewQuestionnaire={onNewQuestionnaire} />
      <ResponsesMetricCards metrics={metrics} />
      <ResponsesToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        totalWorkspaces={workspaces.length}
        draftCount={workspaces.filter((w) => w.status === "Draft").length}
        metrics={metrics}
      />
      {filteredWorkspaces.length === 0 ? (
        <ResponsesEmptyState hasFilters={hasFilters} onResetFilters={resetFilters} onNewQuestionnaire={onNewQuestionnaire} />
      ) : viewMode === "table" ? (
        <ResponsesTableView workspaces={filteredWorkspaces} actionLoadingId={actionLoadingId} onSelectWorkspace={onSelectWorkspace} onExportWorkspace={onExportWorkspace} onDuplicate={handleDuplicate} onConfirmDelete={setConfirmDeleteId} />
      ) : (
        <ResponsesGridCardsView workspaces={filteredWorkspaces} actionLoadingId={actionLoadingId} onSelectWorkspace={onSelectWorkspace} onExportWorkspace={onExportWorkspace} onDuplicate={handleDuplicate} onConfirmDelete={setConfirmDeleteId} />
      )}
      <DeleteConfirmModal workspaceId={confirmDeleteId} actionLoadingId={actionLoadingId} onClose={() => setConfirmDeleteId(null)} onDelete={handleDelete} />
    </div>
  );
};
