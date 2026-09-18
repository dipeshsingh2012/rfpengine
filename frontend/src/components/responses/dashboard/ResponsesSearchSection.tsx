import React from "react";
import { Search } from "lucide-react";
import { DashboardMetrics } from "./dashboardTypes";

interface ResponsesSearchSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  totalWorkspaces: number;
  draftCount: number;
  metrics: DashboardMetrics;
}

export const ResponsesSearchSection: React.FC<ResponsesSearchSectionProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  totalWorkspaces,
  draftCount,
  metrics,
}) => {
  return (
    <div className="toolbar-search-section">
      <div className="search-field">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search RFPs by title, URL, or reviewer role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-search" onClick={() => setSearchTerm("")}>
            ×
          </button>
        )}
      </div>

      <div className="status-pill-group">
        <button
          className={`pill-btn ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All ({totalWorkspaces})
        </button>
        <button
          className={`pill-btn ${statusFilter === "in_review" ? "active" : ""}`}
          onClick={() => setStatusFilter("in_review")}
        >
          In Review ({metrics.inReview})
        </button>
        <button
          className={`pill-btn ${statusFilter === "approved" ? "active" : ""}`}
          onClick={() => setStatusFilter("approved")}
        >
          Approved ({metrics.approved})
        </button>
        <button
          className={`pill-btn ${statusFilter === "draft" ? "active" : ""}`}
          onClick={() => setStatusFilter("draft")}
        >
          Draft ({draftCount})
        </button>
      </div>
    </div>
  );
};

