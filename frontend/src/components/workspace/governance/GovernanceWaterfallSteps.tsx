import React from "react";
import { ReviewerRole } from "../../../types";

interface GovernanceWaterfallStepsProps {
  role: ReviewerRole;
  approvedCount: number;
  allQuestionsCount: number;
  inReviewCount: number;
  changesRequestedCount: number;
}

const STAGES = [
  { id: "Proposal manager", step: 1, label: "Drafting", icon: "🧑‍💻" },
  { id: "Security SME", step: 2, label: "Security SME", icon: "🛡️" },
  { id: "Legal reviewer", step: 3, label: "Legal Review", icon: "⚖️" },
  { id: "Final approver", step: 4, label: "Final Sign-off", icon: "👑" },
];

export const GovernanceWaterfallSteps: React.FC<GovernanceWaterfallStepsProps> = ({
  role,
  approvedCount,
  allQuestionsCount,
}) => {
  const currentStep = STAGES.findIndex((s) => s.id === role) + 1;
  const isComplete = allQuestionsCount > 0 && approvedCount === allQuestionsCount;

  return (
    <div className="governance-role-select" style={{ gap: "10px" }}>
      <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>Governance Pipeline:</span>
      <div className="role-pills" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {STAGES.map((s, idx) => {
          const isActive = role === s.id;
          const isPassed = isComplete || currentStep > s.step;
          return (
            <React.Fragment key={s.id}>
              <span
                className={`role-pill ${isActive ? "active" : ""}`}
                style={{
                  cursor: "default",
                  opacity: isActive ? 1 : isPassed ? 0.9 : 0.6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  padding: "4px 9px",
                }}
                title={`Waterfall stage ${s.step}: ${s.label}`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                {isActive && <span style={{ fontSize: "9px", background: "rgba(0,0,0,0.1)", padding: "1px 4px", borderRadius: "4px" }}>Active</span>}
              </span>
              {idx < STAGES.length - 1 && (
                <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 700 }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

