import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Plus,
  Copy,
  Trash2,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutGrid,
  List,
  RotateCcw,
  Sparkles,
  Shield,
  FileSpreadsheet,
  Globe,
  Layers,
} from "lucide-react";
import { WorkspaceSummaryItem } from "../../types";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "questions" | "completion">("updated");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Executive Metric Calculations
  const metrics = useMemo(() => {
    const total = workspaces.length;
    const inReview = workspaces.filter(
      (w) => w.status === "In Review" || w.in_review_count > 0,
    ).length;
    const approved = workspaces.filter(
      (w) => w.status === "Approved" || (w.total_questions > 0 && w.approved_count === w.total_questions),
    ).length;
    const totalQuestions = workspaces.reduce((sum, w) => sum + w.total_questions, 0);
    const totalApproved = workspaces.reduce((sum, w) => sum + w.approved_count, 0);
    const avgCompletion =
      totalQuestions > 0 ? Math.round((totalApproved / totalQuestions) * 100) : 0;

    return { total, inReview, approved, avgCompletion, totalQuestions };
  }, [workspaces]);

  // Filtered & Sorted Workspaces
  const filteredWorkspaces = useMemo(() => {
    return workspaces
      .filter((w) => {
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = w.title.toLowerCase().includes(q);
          const matchUrl = w.source_url?.toLowerCase().includes(q) || false;
          const matchRoles = w.assigned_roles.some((r) => r.toLowerCase().includes(q));
          if (!matchTitle && !matchUrl && !matchRoles) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
          if (statusFilter === "approved" && w.status !== "Approved") return false;
          if (statusFilter === "in_review" && w.status !== "In Review" && w.in_review_count === 0) return false;
          if (statusFilter === "draft" && w.status !== "Draft") return false;
          if (statusFilter === "changes" && w.status !== "Changes Requested" && w.changes_requested_count === 0) return false;
        }

        // Source filter
        if (sourceFilter !== "all" && w.source_mode !== sourceFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "questions") {
          return b.total_questions - a.total_questions;
        }
        if (sortBy === "completion") {
          return b.completion_percentage - a.completion_percentage;
        }
        // Default: last updated
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });
  }, [workspaces, searchTerm, statusFilter, sourceFilter, sortBy]);

  const handleDuplicate = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActionLoadingId(id);
    try {
      await onDuplicateWorkspace(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActionLoadingId(id);
    try {
      await onDeleteWorkspace(id);
      setConfirmDeleteId(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getSourceBadge = (mode: string, title: string) => {
    if (mode === "url") {
      return (
        <span className="source-pill url">
          <Globe size={12} /> Web Form
        </span>
      );
    }
    if (title.toLowerCase().endsWith(".csv") || mode === "upload") {
      return (
        <span className="source-pill upload">
          <FileSpreadsheet size={12} /> Spreadsheet
        </span>
      );
    }
    return (
      <span className="source-pill extension">
        <Layers size={12} /> Assistant
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <span className="status-badge approved"><CheckCircle2 size={13} /> 100% Approved</span>;
      case "In Review":
        return <span className="status-badge review"><Clock size={13} /> In Review</span>;
      case "Changes Requested":
        return <span className="status-badge changes"><AlertCircle size={13} /> Changes Requested</span>;
      default:
        return <span className="status-badge draft">Draft</span>;
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="responses-dashboard-container">
      {/* Top Header */}
      <div className="page-heading responses-header">
        <div>
          <p className="breadcrumb">
            <span>RFP Engine</span> <span>/</span> <strong>Responses</strong>
          </p>
          <h1>Questionnaire Responses</h1>
          <p className="subtitle">
            Manage, review, and track RFP and security questionnaires across all buyers.
          </p>
        </div>
        <div className="header-action-group">
          <button
            className="secondary-button"
            onClick={onRefresh}
            title="Refresh database records"
            disabled={isLoading}
          >
            <RotateCcw size={15} className={isLoading ? "spin-icon" : ""} /> Refresh
          </button>
          <button className="primary-button" onClick={onNewQuestionnaire}>
            <Plus size={16} /> New Questionnaire
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="responses-metric-cards">
        <div className="responses-stat-card">
          <div className="stat-card-icon blue">
            <FileText size={20} />
          </div>
          <div>
            <span className="stat-value">{metrics.total}</span>
            <span className="stat-label">Total Questionnaires</span>
          </div>
        </div>

        <div className="responses-stat-card">
          <div className="stat-card-icon orange">
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-value">{metrics.inReview}</span>
            <span className="stat-label">In Review Queue</span>
          </div>
        </div>

        <div className="responses-stat-card">
          <div className="stat-card-icon green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="stat-value">{metrics.approved}</span>
            <span className="stat-label">100% Approved</span>
          </div>
        </div>

        <div className="responses-stat-card">
          <div className="stat-card-icon purple">
            <Shield size={20} />
          </div>
          <div>
            <span className="stat-value">{metrics.avgCompletion}%</span>
            <span className="stat-label">Avg Completion</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="responses-toolbar panel">
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
              All ({workspaces.length})
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
              Draft ({workspaces.filter((w) => w.status === "Draft").length})
            </button>
          </div>
        </div>

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
      </div>

      {/* Main Content Area: Table vs Grid vs Empty */}
      {isLoading && workspaces.length === 0 ? (
        <div className="responses-loading-state panel">
          <div className="spinner-large" />
          <p>Loading questionnaire workspaces from PostgreSQL...</p>
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="responses-empty-state panel">
          <div className="empty-icon-wrap">
            <FileText size={36} />
          </div>
          <h3>No questionnaires found</h3>
          <p>
            {searchTerm || statusFilter !== "all" || sourceFilter !== "all"
              ? "No questionnaires match your active search filters."
              : "No questionnaire responses exist in the PostgreSQL database yet."}
          </p>
          <div className="empty-actions">
            {searchTerm || statusFilter !== "all" || sourceFilter !== "all" ? (
              <button
                className="secondary-button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSourceFilter("all");
                }}
              >
                Reset Filters
              </button>
            ) : (
              <button className="primary-button" onClick={onNewQuestionnaire}>
                <Plus size={16} /> Start First Questionnaire
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="responses-table-wrap panel">
          <table className="responses-table">
            <thead>
              <tr>
                <th>Questionnaire Title</th>
                <th>Source</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Assigned Roles</th>
                <th>Last Updated</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkspaces.map((ws) => (
                <tr
                  key={ws.id}
                  className="responses-row"
                  onClick={() => onSelectWorkspace(ws.id)}
                >
                  <td className="title-cell">
                    <div className="title-group">
                      <strong className="ws-title">{ws.title}</strong>
                      <span className="ws-id-sub">{ws.id}</span>
                    </div>
                  </td>
                  <td>{getSourceBadge(ws.source_mode, ws.title)}</td>
                  <td>{getStatusBadge(ws.status)}</td>
                  <td className="progress-cell">
                    <div className="progress-bar-group">
                      <div className="progress-meta">
                        <span className="progress-fraction">
                          <strong>{ws.approved_count}</strong>/{ws.total_questions} approved
                        </span>
                        <span className="progress-pct">{ws.completion_percentage}%</span>
                      </div>
                      <div className="segmented-progress-bar">
                        <div
                          className="bar-fill approved"
                          style={{
                            width: `${(ws.approved_count / (ws.total_questions || 1)) * 100}%`,
                          }}
                        />
                        <div
                          className="bar-fill in-review"
                          style={{
                            width: `${(ws.in_review_count / (ws.total_questions || 1)) * 100}%`,
                          }}
                        />
                        <div
                          className="bar-fill changes"
                          style={{
                            width: `${(ws.changes_requested_count / (ws.total_questions || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="roles-cell">
                    {ws.assigned_roles && ws.assigned_roles.length > 0 ? (
                      <div className="roles-pill-list">
                        {ws.assigned_roles.map((r, i) => (
                          <span key={i} className="mini-role-pill">
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="date-cell">
                    <span title={ws.updated_at}>{formatRelativeDate(ws.updated_at)}</span>
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="row-action-buttons">
                      <button
                        className="icon-action-btn"
                        title="Open Workspace"
                        onClick={() => onSelectWorkspace(ws.id)}
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        className="icon-action-btn"
                        title="Export CSV"
                        onClick={() => onExportWorkspace(ws)}
                      >
                        <Download size={15} />
                      </button>
                      <button
                        className="icon-action-btn"
                        title="Duplicate Questionnaire"
                        disabled={actionLoadingId === ws.id}
                        onClick={(e) => handleDuplicate(ws.id, e)}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="icon-action-btn delete"
                        title="Delete from Database"
                        disabled={actionLoadingId === ws.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(ws.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="responses-grid-cards">
          {filteredWorkspaces.map((ws) => (
            <div
              key={ws.id}
              className={`response-grid-card panel ${ws.color || "blue"}`}
              onClick={() => onSelectWorkspace(ws.id)}
            >
              <div className="card-top">
                <div className="source-and-status">
                  {getSourceBadge(ws.source_mode, ws.title)}
                  {getStatusBadge(ws.status)}
                </div>
                <span className="card-time">{formatRelativeDate(ws.updated_at)}</span>
              </div>

              <h3 className="card-title">{ws.title}</h3>
              <p className="card-sub">{ws.id}</p>

              <div className="card-progress-section">
                <div className="progress-meta">
                  <span>
                    <strong>{ws.approved_count}</strong> of {ws.total_questions} questions approved
                  </span>
                  <strong>{ws.completion_percentage}%</strong>
                </div>
                <div className="segmented-progress-bar">
                  <div
                    className="bar-fill approved"
                    style={{
                      width: `${(ws.approved_count / (ws.total_questions || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bar-fill in-review"
                    style={{
                      width: `${(ws.in_review_count / (ws.total_questions || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="bar-fill changes"
                    style={{
                      width: `${(ws.changes_requested_count / (ws.total_questions || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {ws.assigned_roles && ws.assigned_roles.length > 0 && (
                <div className="card-roles">
                  {ws.assigned_roles.map((role, idx) => (
                    <span key={idx} className="mini-role-pill">
                      {role}
                    </span>
                  ))}
                </div>
              )}

              <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                <button
                  className="card-open-btn"
                  onClick={() => onSelectWorkspace(ws.id)}
                >
                  Open Workspace <ExternalLink size={13} />
                </button>
                <div className="card-actions-right">
                  <button
                    className="icon-action-btn"
                    title="Export CSV"
                    onClick={() => onExportWorkspace(ws)}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="icon-action-btn"
                    title="Duplicate Questionnaire"
                    disabled={actionLoadingId === ws.id}
                    onClick={(e) => handleDuplicate(ws.id, e)}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="icon-action-btn delete"
                    title="Delete Questionnaire"
                    disabled={actionLoadingId === ws.id}
                    onClick={() => setConfirmDeleteId(ws.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <AlertCircle size={22} className="text-danger" />
                <h3>Delete Questionnaire Workspace?</h3>
              </div>
              <button className="icon-button" onClick={() => setConfirmDeleteId(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete workspace{" "}
                <strong>{confirmDeleteId}</strong> from PostgreSQL?
              </p>
              <p className="text-subtle">
                This action will cascade delete all question reviews, generated drafts, and SME notes. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={actionLoadingId === confirmDeleteId}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                onClick={(e) => handleDelete(confirmDeleteId, e)}
                disabled={actionLoadingId === confirmDeleteId}
              >
                {actionLoadingId === confirmDeleteId ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

