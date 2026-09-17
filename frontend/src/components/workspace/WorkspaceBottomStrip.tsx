import React from "react";
import { Send } from "lucide-react";

interface WorkspaceBottomStripProps {
  confidenceScore: number;
  onSendForReview: () => void;
}

export const WorkspaceBottomStrip: React.FC<WorkspaceBottomStripProps> = ({
  confidenceScore,
  onSendForReview,
}) => {
  return (
    <div className="bottom-strip">
      <div className="confidence">
        <div className="confidence-ring">
          <span>{Math.round(confidenceScore * 100)}</span>
        </div>
        <div>
          <p className="eyebrow">Confidence score</p>
          <strong>Strong source alignment</strong>
          <small>Based on semantic and keyword retrieval</small>
        </div>
      </div>
      <div className="shortcut-hint">
        <span className="key">⌘</span>
        <span className="key">↵</span> Generate answer
      </div>
      <button
        className="send-button"
        title="Send drafts for Governance Review"
        onClick={onSendForReview}
      >
        <Send size={16} /> Send for review
      </button>
    </div>
  );
};

