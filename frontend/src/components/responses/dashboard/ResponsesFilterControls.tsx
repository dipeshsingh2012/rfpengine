import React from "react";
import { List, LayoutGrid } from "lucide-react";

interface ResponsesFilterControlsProps {
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  sortBy: "updated" | "title" | "questions" | "completion";
  setSortBy: (sort: "updated" | "title" | "questions" | "completion") => void;
  viewMode: "table" | "grid";
  setViewMode: (mode: "table" | "grid") => void;
}

export const ResponsesFilterControls: React.FC<ResponsesFilterControlsProps> = ({
  sourceFilter,
  setSourceFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}) => {
  return (
    <div className="toolbar-controls-section">
      <select
        className="filter-select"
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
        aria-label="Filter by source"
      >
        <option value="all">All Sources</option>
        <option value="url">Web Form URL</option>
        <option value="upload">Spreadsheet / CSV</option>
        <option value="extension">Browser Assistant</option>
      </select>

      <select
        className="filter-select"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
        aria-label="Sort by"
      >
        <option value="updated">Sort: Last Updated</option>
        <option value="title">Sort: Title (A-Z)</option>
        <option value="questions">Sort: Questions Count</option>
        <option value="completion">Sort: Completion %</option>
      </select>

      <div className="view-mode-toggle">
        <button
          className={`view-btn ${viewMode === "table" ? "active" : ""}`}
          onClick={() => setViewMode("table")}
          title="Table View"
        >
          <List size={16} />
        </button>
        <button
          className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
          onClick={() => setViewMode("grid")}
          title="Grid Card View"
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  );
};

