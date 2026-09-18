import { useState } from "react";
import { ReviewerRole } from "../types";

export function useReviewGovernanceState() {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalScope, setReviewModalScope] = useState<"all" | "current">("all");
  const [reviewTargetRole, setReviewTargetRole] = useState<"Security SME" | "Legal reviewer" | "Final approver">("Security SME");
  const [reviewInstructions, setReviewInstructions] = useState("");
  const [reviewSelectedQuestion, setReviewSelectedQuestion] = useState<string | null>(null);
  const [reviewCommentsByQuestion, setReviewCommentsByQuestion] = useState<Record<string, string>>({});

  function openSendForReviewModal(scope: "all" | "current" = "all", targetQuestion?: string) {
    setReviewModalScope(scope);
    setReviewSelectedQuestion(targetQuestion || null);
    setReviewInstructions("");
    setShowReviewModal(true);
  }

  return {
    showReviewModal,
    setShowReviewModal,
    reviewModalScope,
    setReviewModalScope,
    reviewTargetRole,
    setReviewTargetRole,
    reviewInstructions,
    setReviewInstructions,
    reviewSelectedQuestion,
    setReviewSelectedQuestion,
    reviewCommentsByQuestion,
    setReviewCommentsByQuestion,
    openSendForReviewModal,
  };
}
