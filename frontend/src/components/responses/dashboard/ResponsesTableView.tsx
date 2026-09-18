import React from "react";
import { WorkspaceSummaryItem } from "../../../types";
import { ResponsesTableRow } from "./ResponsesTableRow";

interface ResponsesTableViewProps {
  workspaces: WorkspaceSummaryItem[];
  actionLoadingId: string | null;
  onSelectWorkspace: (id: string) => void;
  onExportWorkspace: (ws: WorkspaceSummaryItem) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onConfirmDelete: (id: string) => void;
}

export const ResponsesTableView: React.FC<ResponsesTableViewProps> = ({
  workspaces,
  actionLoadingId,
  onSelectWorkspace,
  onExportWorkspace,
  onDuplicate,
  onConfirmDelete,
}) => {
  return (
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
          {workspaces.map((ws) => (
            <ResponsesTableRow
              key={ws.id}
              workspace={ws}
              actionLoadingId={actionLoadingId}
              onSelectWorkspace={onSelectWorkspace}
              onExportWorkspace={onExportWorkspace}
              onDuplicate={onDuplicate}
              onConfirmDelete={onConfirmDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

