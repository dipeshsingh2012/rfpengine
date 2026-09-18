import React from "react";
import { WorkspaceSummaryItem } from "../../../types";
import { ResponseCardItem } from "./ResponseCardItem";

interface ResponsesGridCardsViewProps {
  workspaces: WorkspaceSummaryItem[];
  actionLoadingId: string | null;
  onSelectWorkspace: (id: string) => void;
  onExportWorkspace: (ws: WorkspaceSummaryItem) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onConfirmDelete: (id: string) => void;
}

export const ResponsesGridCardsView: React.FC<ResponsesGridCardsViewProps> = ({
  workspaces,
  actionLoadingId,
  onSelectWorkspace,
  onExportWorkspace,
  onDuplicate,
  onConfirmDelete,
}) => {
  return (
    <div className="responses-grid-cards">
      {workspaces.map((ws) => (
        <ResponseCardItem
          key={ws.id}
          workspace={ws}
          actionLoadingId={actionLoadingId}
          onSelectWorkspace={onSelectWorkspace}
          onExportWorkspace={onExportWorkspace}
          onDuplicate={onDuplicate}
          onConfirmDelete={onConfirmDelete}
        />
      ))}
    </div>
  );
};

