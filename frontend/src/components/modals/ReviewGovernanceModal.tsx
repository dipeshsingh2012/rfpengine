import React from "react";
import { Send, X } from "lucide-react";

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
  reviewTargetRole,
  setReviewTargetRole,
  reviewSelectedQuestion,
  reviewModalScope,
  setReviewModalScope,
  reviewInstructions,
  setReviewInstructions,
  onSubmit,
  allQuestionsCount,
  currentQuestionText,
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
            <label>
              Target Reviewer Role:
              <select
                value={reviewTargetRole}
                onChange={(e) => setReviewTargetRole(e.target.value as any)}
              >
                <option value="Security SME">🛡️ Security SME (Technical Architecture, Encryption, SLAs)</option>
                <option value="Legal reviewer">⚖️ Legal Reviewer (Compliance, Terms, GDPR, Liability)</option>
                <option value="Final approver">👑 Final Executive Approver (Sign-off & Lock)</option>
              </select>
            </label>

            <label>
              Review Scope:
              <select
                value={reviewSelectedQuestion ? "current" : reviewModalScope}
                onChange={(e) => setReviewModalScope(e.target.value as "all" | "current")}
                disabled={!!reviewSelectedQuestion}
              >
                <option value="all">
                  Entire Questionnaire ({allQuestionsCount} Questions)
                </option>
                <option value="current">
                  {reviewSelectedQuestion
                    ? `Selected: "${reviewSelectedQuestion.slice(0, 40)}..."`
                    : `Current: "${currentQuestionText.slice(0, 40)}..."`}
                </option>
              </select>
            </label>

            <label>
              Review Instructions & Notes (Optional):
              <textarea
                placeholder="e.g. Please verify that our 35-day backup rotation window matches our current SOC 2 Type II audit report."
                value={reviewInstructions}
                onChange={(e) => setReviewInstructions(e.target.value)}
                rows={3}
              />
            </label>

            <div className="review-modal-actions">
              <button
                type="button"
                className="outline-button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                <Send size={14} /> Dispatch to {reviewTargetRole}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

