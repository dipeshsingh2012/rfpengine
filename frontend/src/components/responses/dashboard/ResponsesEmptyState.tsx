import React from "react";
import { FileText, Plus } from "lucide-react";

interface ResponsesEmptyStateProps {
  hasFilters: boolean;
  onResetFilters: () => void;
  onNewQuestionnaire: () => void;
}

export const ResponsesEmptyState: React.FC<ResponsesEmptyStateProps> = ({
  hasFilters,
  onResetFilters,
  onNewQuestionnaire,
}) => {
  return (
    <div className="responses-empty-state panel">
      <div className="empty-icon-wrap">
        <FileText size={36} />
      </div>
      <h3>No questionnaires found</h3>
      <p>
        {hasFilters
          ? "No questionnaires match your active search filters."
          : "No questionnaire responses exist in the PostgreSQL database yet."}
      </p>
      <div className="empty-actions">
        {hasFilters ? (
          <button className="secondary-button" onClick={onResetFilters}>
            Reset Filters
          </button>
        ) : (
          <button className="primary-button" onClick={onNewQuestionnaire}>
            <Plus size={16} /> Start First Questionnaire
          </button>
        )}
      </div>
    </div>
  );
};

