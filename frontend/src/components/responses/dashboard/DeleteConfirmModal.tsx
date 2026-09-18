import React from "react";
import { AlertCircle, X } from "lucide-react";
import { ModalPortal } from "../../common/ModalPortal";

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
  return (
    <ModalPortal
      isOpen={Boolean(workspaceId)}
      onClose={onClose}
      cardClassName="modal delete-confirm-modal"
      ariaLabel="Delete Questionnaire Workspace"
    >
      <div className="modal-header">
        <div className="modal-title-wrap">
          <AlertCircle size={22} className="text-danger" />
          <h3>Delete Questionnaire Workspace?</h3>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
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
          autoFocus
        >
          Cancel
        </button>
        <button
          className="danger-button"
          onClick={(e) => workspaceId && onDelete(workspaceId, e)}
          disabled={actionLoadingId === workspaceId}
        >
          {actionLoadingId === workspaceId ? "Deleting..." : "Permanently Delete"}
        </button>
      </div>
    </ModalPortal>
  );
};
