import React from "react";
import { Sparkles, RefreshCw, ArrowUpRight } from "lucide-react";

interface SingleQuestionInputPanelProps {
  question: string;
  setQuestion: (q: string) => void;
  tenantId: string;
  setTenantId: (id: string) => void;
  generateAnswer: () => void;
  isGenerating: boolean;
  isApproved?: boolean;
}

export const SingleQuestionInputPanel: React.FC<SingleQuestionInputPanelProps> = ({
  question,
  setQuestion,
  tenantId,
  setTenantId,
  generateAnswer,
  isGenerating,
  isApproved = false,
}) => {
  return (
    <section className="question-panel panel">
      <div className="panel-label">
        <span className="step-number">01</span>
        <div>
          <p className="eyebrow">Question to answer</p>
          <span className="label-hint">
            Ask a question or paste one from your RFP
          </span>
        </div>
      </div>
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={3}
      />
      <div className="question-footer">
        <div className="question-meta">
          <span className="status-dot" /> Knowledge base connected{" "}
          <span className="divider" /> Tenant:{" "}
          <select
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
          >
            <option value="acme-corp">acme-corp</option>
            <option value="enterprise-corp">enterprise-corp</option>
          </select>
        </div>
        <button
          className="primary-button"
          onClick={generateAnswer}
          disabled={isGenerating || isApproved}
          title={isApproved ? "Response has already been approved" : "Draft answer with AI"}
        >
          {isGenerating ? (
            <RefreshCw className="spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          {isGenerating ? "Drafting..." : "Draft with Proposal Drafter"}{" "}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </section>
  );
};

