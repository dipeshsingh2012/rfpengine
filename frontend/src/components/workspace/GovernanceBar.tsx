import React from "react";
import { ReviewerRole } from "../../types";
import { GovernanceRolePills } from "./governance/GovernanceRolePills";
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
      <GovernanceRolePills role={role} setRole={setRole} showToast={showToast} />
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
