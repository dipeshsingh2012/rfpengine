import React from "react";
import { Plus, RotateCcw } from "lucide-react";

interface ResponsesHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  onNewQuestionnaire: () => void;
}

export const ResponsesHeader: React.FC<ResponsesHeaderProps> = ({
  isLoading,
  onRefresh,
  onNewQuestionnaire,
}) => {
  return (
    <div className="page-heading responses-header">
      <div>
        <p className="breadcrumb">
          <span>RFP Engine</span> <span>/</span> <strong>Responses</strong>
        </p>
        <h1>Questionnaire Responses</h1>
        <p className="subtitle">
          Manage, review, and track RFP and security questionnaires across all buyers.
        </p>
      </div>
      <div className="header-action-group">
        <button
          className="secondary-button"
          onClick={onRefresh}
          title="Refresh database records"
          disabled={isLoading}
        >
          <RotateCcw size={15} className={isLoading ? "spin-icon" : ""} /> Refresh
        </button>
        <button className="primary-button" onClick={onNewQuestionnaire}>
          <Plus size={16} /> New Questionnaire
        </button>
      </div>
    </div>
  );
};

