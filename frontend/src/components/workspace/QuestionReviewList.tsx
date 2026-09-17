import React from "react";
import { MessageSquare, ThumbsDown, Send, Check, RefreshCw, Sparkles } from "lucide-react";
import { ReviewerRole } from "../../types";
import { getStatusBadgeClass } from "../../utils/helpers";

interface QuestionReviewListProps {
  detectedQuestions: string[];
  reviewStatusByQuestion: Record<string, string>;
  reviewCommentsByQuestion: Record<string, string>;
  answersByQuestion: Record<string, string>;
  setAnswersByQuestion: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveAnswers: (answers: Record<string, string>) => void;
  handleRequestChanges: (question: string) => void;
  openSendForReviewModal: (scope: "all" | "current", question?: string) => void;
  handleApproveQuestion: (question: string) => void;
  isBatchApproved: boolean;
  role: ReviewerRole;
  handleIndividualReview: (question: string) => void;
  promotedQuestions: Record<string, boolean>;
  handlePromoteToKnowledgeBase: (question: string, index: number) => void;
}

export const QuestionReviewList: React.FC<QuestionReviewListProps> = ({
  detectedQuestions,
  reviewStatusByQuestion,
  reviewCommentsByQuestion,
  answersByQuestion,
  setAnswersByQuestion,
  saveAnswers,
  handleRequestChanges,
  openSendForReviewModal,
  handleApproveQuestion,
  isBatchApproved,
  role,
  handleIndividualReview,
  promotedQuestions,
  handlePromoteToKnowledgeBase,
}) => {
  if (detectedQuestions.length === 0) return null;

  return (
    <div className="question-review-list">
      {detectedQuestions.map((item, index) => {
        const isApproved = reviewStatusByQuestion[item]?.toLowerCase().includes("approve");
        return (
          <article className="question-review-card panel" key={`${item}-${index}`}>
            <div className="question-review-header">
              <span className="source-rank">Q{String(index + 1).padStart(2, "0")}</span>
              <span className={`review-status ${getStatusBadgeClass(reviewStatusByQuestion[item])}`}>
                {reviewStatusByQuestion[item] ||
                  (answersByQuestion[item] ? "DRAFT READY" : "NOT GENERATED")}
              </span>
            </div>
            <h2>{item}</h2>

            {reviewCommentsByQuestion[item] && (
              <div className="review-note-callout">
                <MessageSquare size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                <div>{reviewCommentsByQuestion[item]}</div>
              </div>
            )}

            <textarea
              className="question-review-answer"
              value={answersByQuestion[item] || ""}
              placeholder="Click 'Generate All Answers' to populate this response with AI..."
              onChange={(event) => {
                const nextAnswers = { ...answersByQuestion, [item]: event.target.value };
                setAnswersByQuestion(nextAnswers);
                saveAnswers(nextAnswers);
              }}
            />
            <div className="question-review-actions">
              <button
                className="reject-button"
                onClick={() => handleRequestChanges(item)}
                title="Leave feedback / request edits"
              >
                <ThumbsDown size={14} /> Request changes
              </button>
              <button
                className="outline-button"
                onClick={() => openSendForReviewModal("current", item)}
                title="Route to Security SME, Legal, or Final Approver"
              >
                <Send size={14} /> Send for review
              </button>
              <button
                className="approve-button"
                onClick={() => handleApproveQuestion(item)}
                disabled={isBatchApproved || Boolean(isApproved)}
                title={`Approve answer as ${role}`}
              >
                <Check size={14} /> Approve as {role === "Proposal manager" ? "Drafter" : role}
              </button>
              {(isBatchApproved || isApproved) && (
                <button
                  className="outline-button"
                  onClick={() => handleIndividualReview(item)}
                  title="Return question to review state"
                  style={{ padding: "4px 10px", fontSize: "12px" }}
                >
                  <RefreshCw size={12} /> Review
                </button>
              )}
              {isApproved && (
                promotedQuestions[item] ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#b45309",
                      background: "#fef3c7",
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      border: "1px solid #fcd34d",
                    }}
                  >
                    <Sparkles size={12} /> ⭐ Promoted to KB
                  </span>
                ) : (
                  <button
                    className="primary-button"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderColor: "#b45309",
                      fontSize: "12px",
                      padding: "6px 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      color: "#ffffff",
                      fontWeight: 700,
                    }}
                    onClick={() => handlePromoteToKnowledgeBase(item, index)}
                    title="Promote verified answer to canonical Knowledge Base as Golden Q&A"
                  >
                    <Sparkles size={13} /> ⭐ Promote to KB
                  </button>
                )
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

