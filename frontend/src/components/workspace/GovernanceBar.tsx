import React from "react";
import { Check, Clock, MessageSquare, RefreshCw } from "lucide-react";
import { ReviewerRole } from "../../types";

interface GovernanceBarProps {
  role: ReviewerRole;
  setRole: (role: ReviewerRole) => void;
  showToast: (msg: string) => void;
  approvedCount: number;
  allQuestionsCount: number;
  inReviewCount: number;
  changesRequestedCount: number;
  isBatchApproved: boolean;
  handleBatchApproveAll: () => void;
  handleReviewReset: () => void;
}

export const GovernanceBar: React.FC<GovernanceBarProps> = ({
  role,
  setRole,
  showToast,
  approvedCount,
  allQuestionsCount,
  inReviewCount,
  changesRequestedCount,
  isBatchApproved,
  handleBatchApproveAll,
  handleReviewReset,
}) => {
  return (
    <div className="governance-bar panel">
      <div className="governance-role-select">
        <span className="eyebrow">Acting Role:</span>
        <div className="role-pills">
          <button
            className={`role-pill ${role === "Proposal manager" ? "active" : ""}`}
            onClick={() => {
              setRole("Proposal manager");
              showToast("Active Role: Proposal Drafter");
            }}
          >
            🧑‍💻 Proposal Drafter
          </button>
          <button
            className={`role-pill ${role === "Security SME" ? "active" : ""}`}
            onClick={() => {
              setRole("Security SME");
              showToast("Active Role: Security SME");
            }}
          >
            🛡️ Security SME
          </button>
          <button
            className={`role-pill ${role === "Legal reviewer" ? "active" : ""}`}
            onClick={() => {
              setRole("Legal reviewer");
              showToast("Active Role: Legal Reviewer");
            }}
          >
            ⚖️ Legal Reviewer
          </button>
          <button
            className={`role-pill ${role === "Final approver" ? "active" : ""}`}
            onClick={() => {
              setRole("Final approver");
              showToast("Active Role: Final Approver");
            }}
          >
            👑 Final Approver
          </button>
        </div>
      </div>
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
        {isBatchApproved ? (
          <>
            <button
              className="outline-button"
              disabled
              style={{ padding: "5px 10px", fontSize: "11px", opacity: 0.6 }}
            >
              <Check size={12} /> Approved as Drafter
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
            title={`Batch approve all questions as ${role}`}
          >
            <Check size={12} /> Approve All as {role === "Proposal manager" ? "Drafter" : role}
          </button>
        )}
      </div>
    </div>
  );
};

