import React from "react";
import { ReviewerRole } from "../../types";
import { QuestionReviewItemCard } from "./question-review/QuestionReviewItemCard";

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
        const isApproved = Boolean(reviewStatusByQuestion[item]?.toLowerCase().includes("approve"));
        return (
          <QuestionReviewItemCard
            key={`${item}-${index}`}
            item={item}
            index={index}
            reviewStatus={reviewStatusByQuestion[item]}
            reviewComment={reviewCommentsByQuestion[item]}
            answer={answersByQuestion[item] || ""}
            onAnswerChange={(newAnswer) => {
              const next = { ...answersByQuestion, [item]: newAnswer };
              setAnswersByQuestion(next);
              saveAnswers(next);
            }}
            onRequestChanges={() => handleRequestChanges(item)}
            onSendForReview={() => openSendForReviewModal("current", item)}
            onApprove={() => handleApproveQuestion(item)}
            onResetReview={() => handleIndividualReview(item)}
            onPromote={() => handlePromoteToKnowledgeBase(item, index)}
            isApproved={isApproved}
            isBatchApproved={isBatchApproved}
            isPromoted={Boolean(promotedQuestions[item])}
            role={role}
          />
        );
      })}
    </div>
  );
};
