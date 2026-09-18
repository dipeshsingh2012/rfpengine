import React from "react";
import { Send, X } from "lucide-react";
import { ReviewRoleSelector } from "./review-governance/ReviewRoleSelector";

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
  if (!isOpen) return null;

  return (
    <div className="kb-modal-backdrop" onClick={onClose}>
      <div className="kb-modal-container review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal-header">
          <h2 style={{ fontSize: "16px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Send size={18} color="var(--blue)" /> Send Answers for Governance Review
          </h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="kb-modal-body" style={{ padding: "20px 24px" }}>
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
              <button type="button" className="outline-button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                <Send size={14} /> Dispatch to {roleProps.reviewTargetRole}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
