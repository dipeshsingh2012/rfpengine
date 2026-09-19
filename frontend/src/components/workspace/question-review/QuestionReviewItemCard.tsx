import React from "react";
import { MessageSquare, ThumbsDown, Send, Check, RefreshCw, Sparkles } from "lucide-react";
import { ReviewerRole } from "../../../types";
import { getStatusBadgeClass } from "../../../utils/helpers";
import { getRoleActionLabel, isStageCompletedForRole } from "../../../utils/governanceHelpers";

interface QuestionReviewItemCardProps {
  item: string;
  index: number;
  reviewStatus: string | undefined;
  reviewComment: string | undefined;
  answer: string;
  onAnswerChange: (newAnswer: string) => void;
  onRequestChanges: () => void;
  onSendForReview: () => void;
  onApprove: () => void;
  onResetReview: () => void;
  onPromote: () => void;
  isApproved: boolean;
  isBatchApproved: boolean;
  isPromoted: boolean;
  role: ReviewerRole;
}

export const QuestionReviewItemCard: React.FC<QuestionReviewItemCardProps> = ({
  item, index, reviewStatus, reviewComment, answer, onAnswerChange, onRequestChanges,
  onSendForReview, onApprove, onResetReview, onPromote, isApproved, isBatchApproved, isPromoted, role,
}) => {
  const isDone = isBatchApproved || isApproved || isStageCompletedForRole(role, reviewStatus);
  const actionLabel = isApproved ? "Approved" : isStageCompletedForRole(role, reviewStatus) ? `Passed ${role === "Proposal manager" ? "Drafter" : role}` : getRoleActionLabel(role);

  return (
    <article className="question-review-card panel">
      <div className="question-review-header">
        <span className="source-rank">Q{String(index + 1).padStart(2, "0")}</span>
        <span className={`review-status ${getStatusBadgeClass(reviewStatus)}`}>
          {reviewStatus || (answer ? "DRAFT READY" : "NOT GENERATED")}
        </span>
      </div>
      <h2>{item}</h2>

      {reviewComment && (
        <div className="review-note-callout">
          <MessageSquare size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>{reviewComment}</div>
        </div>
      )}

      <textarea
        className="question-review-answer"
        value={answer}
        placeholder="Click 'Generate All Answers' to populate this response with AI..."
        onChange={(e) => onAnswerChange(e.target.value)}
      />
      <div className="question-review-actions">
        <button className="reject-button" onClick={onRequestChanges} title="Leave feedback / request edits">
          <ThumbsDown size={14} /> Request changes
        </button>
        <button className="outline-button" onClick={onSendForReview} title="Route to Security SME, Legal, or Final Approver">
          <Send size={14} /> Send for review
        </button>
        <button className="approve-button" onClick={onApprove} disabled={isDone} title={`Advance answer as ${role}`}>
          <Check size={14} /> {actionLabel}
        </button>
        {isDone && (
          <button className="outline-button" onClick={onResetReview} title="Return question to review state" style={{ padding: "4px 10px", fontSize: "12px" }}>
            <RefreshCw size={12} /> Review
          </button>
        )}
        {isApproved && (
          isPromoted ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "4px 10px", borderRadius: "9999px", border: "1px solid #fcd34d" }}>
              <Sparkles size={12} /> ⭐ Promoted to KB
            </span>
          ) : (
            <button className="primary-button" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", borderColor: "#b45309", fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px", color: "#ffffff", fontWeight: 700 }} onClick={onPromote} title="Promote verified answer to canonical Knowledge Base as Golden Q&A">
              <Sparkles size={13} /> ⭐ Promote to KB
            </button>
          )
        )}
      </div>
    </article>
  );
};

