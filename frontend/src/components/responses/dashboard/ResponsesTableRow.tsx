import React from "react";
import { ExternalLink, Download, Copy, Trash2 } from "lucide-react";
import { WorkspaceSummaryItem } from "../../../types";
import { getSourceBadge, getStatusBadge, formatRelativeDate } from "./dashboardTypes";

interface ResponsesTableRowProps {
  workspace: WorkspaceSummaryItem;
  actionLoadingId: string | null;
  onSelectWorkspace: (id: string) => void;
  onExportWorkspace: (ws: WorkspaceSummaryItem) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onConfirmDelete: (id: string) => void;
}

export const ResponsesTableRow: React.FC<ResponsesTableRowProps> = ({
  workspace: ws,
  actionLoadingId,
  onSelectWorkspace,
  onExportWorkspace,
  onDuplicate,
  onConfirmDelete,
}) => {
  const total = ws.total_questions || 1;
  return (
    <tr className="responses-row" onClick={() => onSelectWorkspace(ws.id)}>
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
            <div className="bar-fill approved" style={{ width: `${(ws.approved_count / total) * 100}%` }} />
            <div className="bar-fill in-review" style={{ width: `${(ws.in_review_count / total) * 100}%` }} />
            <div className="bar-fill changes" style={{ width: `${(ws.changes_requested_count / total) * 100}%` }} />
          </div>
        </div>
      </td>
      <td className="roles-cell">
        {ws.assigned_roles && ws.assigned_roles.length > 0 ? (
          <div className="roles-pill-list">
            {ws.assigned_roles.map((r, i) => (
              <span key={i} className="mini-role-pill">{r}</span>
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
          <button className="icon-action-btn" title="Open Workspace" onClick={() => onSelectWorkspace(ws.id)}>
            <ExternalLink size={15} />
          </button>
          <button className="icon-action-btn" title="Export CSV" onClick={() => onExportWorkspace(ws)}>
            <Download size={15} />
          </button>
          <button
            className="icon-action-btn"
            title="Duplicate Questionnaire"
            disabled={actionLoadingId === ws.id}
            onClick={(e) => onDuplicate(ws.id, e)}
          >
            <Copy size={15} />
          </button>
          <button
            className="icon-action-btn delete"
            title="Delete from Database"
            disabled={actionLoadingId === ws.id}
            onClick={(e) => { e.stopPropagation(); onConfirmDelete(ws.id); }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};

