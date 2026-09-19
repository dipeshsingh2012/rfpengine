import { useState } from "react";
import { ReviewerRole, SourceMode, starterQuestions } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export function useQuestionnaireWorkflow(tenantId: string, initialResponseId?: string | null) {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [detectedQuestions, setDetectedQuestions] = useState<string[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, string>>({});
  const [reviewStatusByQuestion, setReviewStatusByQuestion] = useState<Record<string, string>>({});
  const [promotedQuestions, setPromotedQuestions] = useState<Record<string, boolean>>({});
  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [sourceLabel, setSourceLabel] = useState("");
  const [responseId, setResponseId] = useState(initialResponseId);
  const [role, setRole] = useState<ReviewerRole>("Proposal manager");
  const [isBatchApproved, setIsBatchApproved] = useState(false);

  function persistDb(nextAnswers?: Record<string, string>, nextStatuses?: Record<string, string>) {
    if (!responseId) return;
    fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${responseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
      body: JSON.stringify({ answers: nextAnswers, review_statuses: nextStatuses }),
    }).catch(() => {});
  }

  function saveAnswers(next: Record<string, string>) {
    setAnswersByQuestion(next);
    persistDb(next, reviewStatusByQuestion);
  }

  function saveReviewStatuses(next: Record<string, string>) {
    setReviewStatusByQuestion(next);
    persistDb(answersByQuestion, next);
  }

  function handleApproveQuestion(item: string) {
    const next = role === "Security SME" ? "Approved by SME" : role === "Legal reviewer" ? "Approved by Legal" : role === "Final approver" ? "Final approved" : "Approved";
    saveReviewStatuses({ ...reviewStatusByQuestion, [item]: next });
  }

  function handleBatchApproveAll() {
    const next = role === "Security SME" ? "Approved by SME" : role === "Legal reviewer" ? "Approved by Legal" : role === "Final approver" ? "Final approved" : "Approved";
    const all = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const map: Record<string, string> = { ...reviewStatusByQuestion };
    all.forEach((q) => { map[q] = next; });
    saveReviewStatuses(map);
    setIsBatchApproved(true);
  }

  function handleReviewReset() {
    setIsBatchApproved(false);
    const all = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const map: Record<string, string> = {};
    all.forEach((q) => { map[q] = "In Review"; });
    saveReviewStatuses(map);
  }

  function handleIndividualReview(item: string) {
    saveReviewStatuses({ ...reviewStatusByQuestion, [item]: "In Review" });
    setIsBatchApproved(false);
  }

  async function handlePromoteToKnowledgeBase(itemText: string, index: number, currentAnswer: string) {
    if (responseId) {
      await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${responseId}/questions/${index}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({ category: "Golden Q&A" }),
      }).catch(() => {});
    }
    setPromotedQuestions((prev) => ({ ...prev, [itemText]: true }));
  }

  const allCurrentQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
  const approvedCount = allCurrentQuestions.filter((q) =>
    (reviewStatusByQuestion[q] || "").toLowerCase().includes("approve")
  ).length;
  const inReviewCount = allCurrentQuestions.filter((q) => ["SME review", "Legal review", "Ready for Final Approval"].includes(reviewStatusByQuestion[q])).length;
  const changesRequestedCount = allCurrentQuestions.filter((q) => reviewStatusByQuestion[q] === "Changes requested").length;
  const isAllApproved = allCurrentQuestions.length > 0 && approvedCount === allCurrentQuestions.length;

  return {
    question, setQuestion, detectedQuestions, setDetectedQuestions, answersByQuestion,
    setAnswersByQuestion, reviewStatusByQuestion, setReviewStatusByQuestion, promotedQuestions,
    setPromotedQuestions, sourceMode, setSourceMode, sourceLabel, setSourceLabel, responseId,
    setResponseId, role, setRole, isBatchApproved, setIsBatchApproved, saveAnswers, saveReviewStatuses,
    handleApproveQuestion, handleBatchApproveAll, handleReviewReset, handleIndividualReview,
    handlePromoteToKnowledgeBase, allCurrentQuestions, approvedCount, inReviewCount,
    changesRequestedCount, isAllApproved,
  };
}
