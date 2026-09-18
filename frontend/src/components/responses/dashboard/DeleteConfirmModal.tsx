import React from "react";
import { AlertCircle } from "lucide-react";

interface DeleteConfirmModalProps {
  workspaceId: string | null;
  actionLoadingId: string | null;
  onClose: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  workspaceId,
  actionLoadingId,
  onClose,
  onDelete,
}) => {
  if (!workspaceId) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <AlertCircle size={22} className="text-danger" />
            <h3>Delete Questionnaire Workspace?</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            Are you sure you want to permanently delete workspace{" "}
            <strong>{workspaceId}</strong> from PostgreSQL?
          </p>
          <p className="text-subtle">
            This action will cascade delete all question reviews, generated drafts, and SME notes. This cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="secondary-button"
            onClick={onClose}
            disabled={actionLoadingId === workspaceId}
          >
            Cancel
          </button>
          <button
            className="danger-button"
            onClick={(e) => onDelete(workspaceId, e)}
            disabled={actionLoadingId === workspaceId}
          >
            {actionLoadingId === workspaceId ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

