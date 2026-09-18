import React from "react";
import { Sparkles, RefreshCw, ArrowUpRight } from "lucide-react";

interface BatchQuestionsHeaderBarProps {
  questionsCount: number;
  tenantId: string;
  setTenantId: (id: string) => void;
  generateAllAnswers: () => void;
  isGenerating: boolean;
  isBatchApproved: boolean;
}

export const BatchQuestionsHeaderBar: React.FC<BatchQuestionsHeaderBarProps> = ({
  questionsCount,
  tenantId,
  setTenantId,
  generateAllAnswers,
  isGenerating,
  isBatchApproved,
}) => {
  return (
    <div
      className="question-header-bar panel"
      style={{
        padding: "14px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}
    >
      <div>
        <span className="eyebrow">Questionnaire Response Workspace</span>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
          {questionsCount} Questions in Questionnaire
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div className="question-meta">
          <span className="status-dot" /> Tenant:{" "}
          <select
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
          >
            <option value="acme-corp">acme-corp</option>
            <option value="demo-tenant">demo-tenant</option>
          </select>
        </div>
        <button
          className="primary-button"
          onClick={generateAllAnswers}
          disabled={isGenerating || isBatchApproved}
        >
          {isGenerating ? (
            <RefreshCw className="spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          {isGenerating ? "Generating All..." : "⚡ Generate All Answers"}{" "}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
};

