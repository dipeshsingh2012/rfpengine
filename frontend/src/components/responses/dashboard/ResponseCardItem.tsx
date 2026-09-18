import React from "react";
import { ExternalLink, Download, Copy, Trash2 } from "lucide-react";
import { WorkspaceSummaryItem } from "../../../types";
import { getSourceBadge, getStatusBadge, formatRelativeDate } from "./dashboardTypes";

interface ResponseCardItemProps {
  workspace: WorkspaceSummaryItem;
  actionLoadingId: string | null;
  onSelectWorkspace: (id: string) => void;
  onExportWorkspace: (ws: WorkspaceSummaryItem) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onConfirmDelete: (id: string) => void;
}

export const ResponseCardItem: React.FC<ResponseCardItemProps> = ({
  workspace: ws,
  actionLoadingId,
  onSelectWorkspace,
  onExportWorkspace,
  onDuplicate,
  onConfirmDelete,
}) => {
  return (
    <div className={`response-grid-card panel ${ws.color || "blue"}`} onClick={() => onSelectWorkspace(ws.id)}>
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
            style={{ width: `${(ws.approved_count / (ws.total_questions || 1)) * 100}%` }}
          />
          <div
            className="bar-fill in-review"
            style={{ width: `${(ws.in_review_count / (ws.total_questions || 1)) * 100}%` }}
          />
          <div
            className="bar-fill changes"
            style={{ width: `${(ws.changes_requested_count / (ws.total_questions || 1)) * 100}%` }}
          />
        </div>
      </div>

      {ws.assigned_roles && ws.assigned_roles.length > 0 && (
        <div className="card-roles">
          {ws.assigned_roles.map((role, idx) => (
            <span key={idx} className="mini-role-pill">{role}</span>
          ))}
        </div>
      )}

      <div className="card-footer" onClick={(e) => e.stopPropagation()}>
        <button className="card-open-btn" onClick={() => onSelectWorkspace(ws.id)}>
          Open Workspace <ExternalLink size={13} />
        </button>
        <div className="card-actions-right">
          <button className="icon-action-btn" title="Export CSV" onClick={() => onExportWorkspace(ws)}>
            <Download size={14} />
          </button>
          <button
            className="icon-action-btn"
            title="Duplicate Questionnaire"
            disabled={actionLoadingId === ws.id}
            onClick={(e) => onDuplicate(ws.id, e)}
          >
            <Copy size={14} />
          </button>
          <button
            className="icon-action-btn delete"
            title="Delete Questionnaire"
            disabled={actionLoadingId === ws.id}
            onClick={() => onConfirmDelete(ws.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

