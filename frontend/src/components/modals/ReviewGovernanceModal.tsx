import React from "react";
import { Send, X } from "lucide-react";
import { ReviewRoleSelector } from "./review-governance/ReviewRoleSelector";
import { ModalPortal } from "../common/ModalPortal";

interface ReviewGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewTargetRole: "Security SME" | "Legal reviewer" | "Final approver";
  setReviewTargetRole: (role: "Security SME" | "Legal reviewer" | "Final approver") => void;
  reviewSelectedQuestion: string | null;
  reviewModalScope: "all" | "current";
  setReviewModalScope: (scope: "all" | "current") => void;
  reviewInstructions: string;
  setReviewInstructions: (instructions: string) => void;
  onSubmit: () => void;
  allQuestionsCount: number;
  currentQuestionText: string;
}

export const ReviewGovernanceModal: React.FC<ReviewGovernanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ...roleProps
}) => {
  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      cardClassName="modal-card review-modal"
      ariaLabel="Send Answers for Governance Review"
    >
      <div className="modal-header">
        <h3 className="modal-title-row">
          <Send size={18} color="var(--blue)" /> Send Answers for Governance Review
        </h3>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          <X size={16} />
        </button>
      </div>
      <div className="modal-body">
        <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--muted)" }}>
          Route RFP drafts to the appropriate Subject Matter Expert (SME), Legal counsel, or Final Approver.
        </p>
        <form
          className="review-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <ReviewRoleSelector {...roleProps} />
          <div className="review-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              <Send size={14} /> Dispatch to {roleProps.reviewTargetRole}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
