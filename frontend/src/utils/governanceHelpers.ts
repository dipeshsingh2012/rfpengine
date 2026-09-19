import { ReviewerRole } from "../types";

export function getWaterfallStage(r: ReviewerRole): string {
  if (r === "Proposal manager") return "SME review";
  if (r === "Security SME") return "Legal review";
  if (r === "Legal reviewer") return "Ready for Final Approval";
  return "Final approved";
}

export function getRoleActionLabel(r: ReviewerRole, isBatch: boolean = false): string {
  if (r === "Proposal manager") return isBatch ? "Advance All to Security SME" : "Advance to Security SME";
  if (r === "Security SME") return isBatch ? "Approve All as Security SME" : "Approve as Security SME";
  if (r === "Legal reviewer") return isBatch ? "Approve All as Legal Reviewer" : "Approve as Legal Reviewer";
  return isBatch ? "👑 Final Approve All" : "👑 Final Approve";
}

export function isStageCompletedForRole(role: ReviewerRole, status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  if (s.includes("approve")) return true;
  if (role === "Proposal manager") {
    return status === "SME review" || status === "Legal review" || status === "Ready for Final Approval";
  }
  if (role === "Security SME") {
    return status === "Legal review" || status === "Ready for Final Approval";
  }
  if (role === "Legal reviewer") {
    return status === "Ready for Final Approval";
  }
  return false;
}

