import React from "react";

interface ReviewRoleSelectorProps {
  reviewTargetRole: "Security SME" | "Legal reviewer" | "Final approver";
  setReviewTargetRole: (role: "Security SME" | "Legal reviewer" | "Final approver") => void;
  reviewSelectedQuestion: string | null;
  reviewModalScope: "all" | "current";
  setReviewModalScope: (scope: "all" | "current") => void;
  reviewInstructions: string;
  setReviewInstructions: (instructions: string) => void;
  allQuestionsCount: number;
  currentQuestionText: string;
}

export const ReviewRoleSelector: React.FC<ReviewRoleSelectorProps> = ({
  reviewTargetRole,
  setReviewTargetRole,
  reviewSelectedQuestion,
  reviewModalScope,
  setReviewModalScope,
  reviewInstructions,
  setReviewInstructions,
  allQuestionsCount,
  currentQuestionText,
}) => {
  return (
    <>
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
          <option value="all">Entire Questionnaire ({allQuestionsCount} Questions)</option>
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
    </>
  );
};

