import React from "react";
import { DashboardMetrics } from "./dashboardTypes";
import { ResponsesSearchSection } from "./ResponsesSearchSection";
import { ResponsesFilterControls } from "./ResponsesFilterControls";

interface ResponsesToolbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  sortBy: "updated" | "title" | "questions" | "completion";
  setSortBy: (sort: "updated" | "title" | "questions" | "completion") => void;
  viewMode: "table" | "grid";
  setViewMode: (mode: "table" | "grid") => void;
  totalWorkspaces: number;
  draftCount: number;
  metrics: DashboardMetrics;
}

export const ResponsesToolbar: React.FC<ResponsesToolbarProps> = ({
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
  totalWorkspaces,
  draftCount,
  metrics,
}) => {
  return (
    <div className="responses-toolbar panel">
      <ResponsesSearchSection
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        totalWorkspaces={totalWorkspaces}
        draftCount={draftCount}
        metrics={metrics}
      />
      <ResponsesFilterControls
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
};

