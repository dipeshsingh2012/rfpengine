import React from "react";
import { Check, Clock, MessageSquare, RefreshCw } from "lucide-react";
import { ReviewerRole } from "../../../types";
import { getRoleActionLabel } from "../../../utils/governanceHelpers";

interface GovernanceStatsBadgesProps {
  role: ReviewerRole;
  approvedCount: number;
  allQuestionsCount: number;
  inReviewCount: number;
  changesRequestedCount: number;
  isBatchApproved: boolean;
  handleBatchApproveAll: () => void;
  handleReviewReset: () => void;
}

export const GovernanceStatsBadges: React.FC<GovernanceStatsBadgesProps> = ({
  role,
  approvedCount,
  allQuestionsCount,
  inReviewCount,
  changesRequestedCount,
  isBatchApproved,
  handleBatchApproveAll,
  handleReviewReset,
}) => {
  return (
    <div className="governance-stats">
      <span className="stat-badge approved">
        <Check size={12} /> {approvedCount} / {allQuestionsCount} Approved
      </span>
      {inReviewCount > 0 && (
        <span className="stat-badge review">
          <Clock size={12} /> {inReviewCount} In Review
        </span>
      )}
      {changesRequestedCount > 0 && (
        <span className="stat-badge changes">
          <MessageSquare size={12} /> {changesRequestedCount} Changes Requested
        </span>
      )}
      {isBatchApproved || (allQuestionsCount > 0 && approvedCount === allQuestionsCount) ? (
        <>
          <button
            className="outline-button"
            disabled
            style={{ padding: "5px 10px", fontSize: "11px", opacity: 0.6, cursor: "not-allowed" }}
            title="All questions have already been approved"
          >
            <Check size={12} /> Approve All as {role === "Proposal manager" ? "Drafter" : role}
          </button>
          <button
            className="primary-button"
            style={{ padding: "5px 12px", fontSize: "11px" }}
            onClick={handleReviewReset}
            title="Reset response to In Review status"
          >
            <RefreshCw size={12} /> Review
          </button>
        </>
      ) : (
        <button
          className="outline-button"
          style={{ padding: "5px 10px", fontSize: "11px" }}
          onClick={handleBatchApproveAll}
          title={`Batch advance all questions as ${role}`}
        >
          <Check size={12} /> {getRoleActionLabel(role, true)}
        </button>
      )}
    </div>
  );
};

