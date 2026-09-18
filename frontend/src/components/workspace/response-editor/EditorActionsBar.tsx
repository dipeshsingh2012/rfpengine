import React from "react";
import { Sparkles, ThumbsDown, Check } from "lucide-react";

interface EditorActionsBarProps {
  answerLength: number;
  question: string;
  isApproved: boolean;
  isPromoted: boolean;
  onRequestChanges: (question: string) => void;
  onApproveQuestion: (question: string) => void;
  onPromoteToKB: (question: string) => void;
}

export const EditorActionsBar: React.FC<EditorActionsBarProps> = ({
  answerLength,
  question,
  isApproved,
  isPromoted,
  onRequestChanges,
  onApproveQuestion,
  onPromoteToKB,
}) => {
  return (
    <div className="answer-footer">
      <span>{answerLength} characters</span>
      <div className="answer-actions">
        <button
          className="reject-button"
          onClick={() => onRequestChanges(question)}
        >
          <ThumbsDown size={15} /> Request changes
        </button>
        <button
          className="approve-button"
          onClick={() => onApproveQuestion(question)}
        >
          <Check size={15} /> Approve answer
        </button>
        {isApproved && (
          isPromoted ? (
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
              onClick={() => onPromoteToKB(question)}
              title="Promote verified answer to canonical Knowledge Base as Golden Q&A"
            >
              <Sparkles size={14} /> ⭐ Promote to KB
            </button>
          )
        )}
      </div>
    </div>
  );
};

