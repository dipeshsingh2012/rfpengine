import React, { useState } from "react";
import { Sparkles, RefreshCw, ThumbsDown, Check, BookOpen, Award, ChevronDown, ChevronUp } from "lucide-react";
import { ExemplarItem } from "../../types";

interface ResponseEditorPanelProps {
  notice: string;
  answer: string;
  setAnswer: (answer: string) => void;
  generateAnswer: () => void;
  handleRequestChanges: (question: string) => void;
  handleApproveQuestion: (question: string) => void;
  question: string;
  reviewStatusByQuestion: Record<string, string>;
  promotedQuestions: Record<string, boolean>;
  handlePromoteToKnowledgeBase: (question: string, index: number) => void;
  sourcesCount: number;
  exemplarsUsed?: ExemplarItem[];
  toneApplied?: string;
}

export const ResponseEditorPanel: React.FC<ResponseEditorPanelProps> = ({
  notice,
  answer,
  setAnswer,
  generateAnswer,
  handleRequestChanges,
  handleApproveQuestion,
  question,
  reviewStatusByQuestion,
  promotedQuestions,
  handlePromoteToKnowledgeBase,
  sourcesCount,
  exemplarsUsed,
  toneApplied,
}) => {
  const [showExemplarsDrawer, setShowExemplarsDrawer] = useState(false);
  const isApproved = reviewStatusByQuestion[question]?.toLowerCase().includes("approve");
  const exemplars = exemplarsUsed || [];

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 / Draft response</p>
          <h2>Drafted by Proposal Drafter</h2>
        </div>
        <span className="live-badge">
          <span /> {notice.includes("live") ? "Live" : "Preview"}
        </span>
      </div>
      <div className="answer-panel panel">
        <div className="answer-toolbar">
          <span
            className="source-label"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              color: "var(--blue)",
            }}
          >
            <Sparkles size={14} /> ✍️ Proposal Drafter
          </span>
          <button className="ghost-button" onClick={generateAnswer}>
            <RefreshCw size={14} /> Re-draft
          </button>
        </div>

        {exemplars.length > 0 && (
          <div
            style={{
              margin: "0 16px 12px",
              padding: "8px 12px",
              background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setShowExemplarsDrawer((prev) => !prev)}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                  color: "#166534",
                }}
              >
                <Award size={14} /> ✨ Brand Voice Active: {exemplars.length} Vetted Golden Exemplar{exemplars.length === 1 ? "" : "s"} Injected
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 500,
                    color: "#15803d",
                    background: "#dcfce7",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {toneApplied || "Authoritative & Direct"}
                </span>
              </span>
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {showExemplarsDrawer ? "Hide Details" : "Inspect Exemplars"}
                {showExemplarsDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showExemplarsDrawer && (
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px dashed #86efac",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#14532d" }}>
                  The AI adapted its sentence structure, executive confidence, and tone from these SME-approved answers:
                </p>
                {exemplars.map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    style={{
                      background: "white",
                      border: "1px solid #dcfce7",
                      borderRadius: "4px",
                      padding: "6px 8px",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "2px" }}>
                      Q: {ex.question}
                    </div>
                    <div style={{ color: "#475569", fontStyle: "italic" }}>
                      "{ex.approved_answer.length > 150 ? `${ex.approved_answer.slice(0, 150)}...` : ex.approved_answer}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <textarea
          className="answer-editor"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
        <div className="answer-footer">
          <span>{answer.length} characters</span>
          <div className="answer-actions">
            <button
              className="reject-button"
              onClick={() => handleRequestChanges(question)}
            >
              <ThumbsDown size={15} /> Request changes
            </button>
            <button
              className="approve-button"
              onClick={() => handleApproveQuestion(question)}
            >
              <Check size={15} /> Approve answer
            </button>
            {isApproved && (
              promotedQuestions[question] ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#b45309",
                    background: "#fef3c7",
                    padding: "5px 12px",
                    borderRadius: "9999px",
                    border: "1px solid #fcd34d",
                  }}
                >
                  <Sparkles size={13} /> ⭐ Promoted to KB
                </span>
              ) : (
                <button
                  className="primary-button"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    borderColor: "#b45309",
                    fontSize: "12px",
                    padding: "6px 12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                  onClick={() => handlePromoteToKnowledgeBase(question, 0)}
                  title="Promote verified answer to canonical Knowledge Base as Golden Q&A"
                >
                  <Sparkles size={14} /> ⭐ Promote to KB
                </button>
              )
            )}
          </div>
        </div>
      </div>
      <div className="review-note">
        <span className="note-icon">
          <BookOpen size={15} />
        </span>
        <p>
          <strong>Review before approving.</strong> This draft was generated by your{" "}
          <strong>AI Proposal Drafter</strong> and grounded in {sourcesCount} retrieved sources. Check that the language matches your current policy.
        </p>
      </div>
    </>
  );
};

