import React from "react";
import { ReviewerRole } from "../../types";
import { GovernanceWaterfallSteps } from "./governance/GovernanceWaterfallSteps";
import { GovernanceStatsBadges } from "./governance/GovernanceStatsBadges";

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
      <GovernanceWaterfallSteps
        role={role}
        approvedCount={approvedCount}
        allQuestionsCount={allQuestionsCount}
        inReviewCount={inReviewCount}
        changesRequestedCount={changesRequestedCount}
      />
      <GovernanceStatsBadges
        role={role}
        approvedCount={approvedCount}
        allQuestionsCount={allQuestionsCount}
        inReviewCount={inReviewCount}
        changesRequestedCount={changesRequestedCount}
        isBatchApproved={isBatchApproved}
        handleBatchApproveAll={handleBatchApproveAll}
        handleReviewReset={handleReviewReset}
      />
    </div>
  );
};
