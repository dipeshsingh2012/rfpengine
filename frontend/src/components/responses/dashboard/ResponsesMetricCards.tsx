import React from "react";
import { FileText, Clock, CheckCircle2, Shield } from "lucide-react";
import { DashboardMetrics } from "./dashboardTypes";

interface ResponsesMetricCardsProps {
  metrics: DashboardMetrics;
}

export const ResponsesMetricCards: React.FC<ResponsesMetricCardsProps> = ({ metrics }) => {
  return (
    <div className="responses-metric-cards">
      <div className="responses-stat-card">
        <div className="stat-card-icon blue">
          <FileText size={20} />
        </div>
        <div>
          <span className="stat-value">{metrics.total}</span>
          <span className="stat-label">Total Questionnaires</span>
        </div>
      </div>

      <div className="responses-stat-card">
        <div className="stat-card-icon orange">
          <Clock size={20} />
        </div>
        <div>
          <span className="stat-value">{metrics.inReview}</span>
          <span className="stat-label">In Review Queue</span>
        </div>
      </div>

      <div className="responses-stat-card">
        <div className="stat-card-icon green">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <span className="stat-value">{metrics.approved}</span>
          <span className="stat-label">100% Approved</span>
        </div>
      </div>

      <div className="responses-stat-card">
        <div className="stat-card-icon purple">
          <Shield size={20} />
        </div>
        <div>
          <span className="stat-value">{metrics.avgCompletion}%</span>
          <span className="stat-label">Avg Completion</span>
        </div>
      </div>
    </div>
  );
};

